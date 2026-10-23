import { randomUUID } from 'crypto';
import moment from 'moment';
import { AccountModel } from '../models/AccountModel';
import { HoldingsModel, IHoldingsModel, ITaxLot } from '../models/HoldingsModel';
import { ImportRunDBModel } from '../models/ImportRunModel';
import { IRelievedLot, ITransaction, TransactionModel } from '../models/TransactionModel';
import { roundQty } from '../utils';
import { adjustCash } from './CashController';
import { normalizeTradeAction } from './DocumentImportController';
import { resolveLots, totalsFromLots } from './TaxLotController';

// Every import goes through one planner. The preview shows its plan; the
// commit re-plans from the same request and writes exactly that, so what the
// user reviewed is what lands. Personal data stays on this server: nothing
// here calls an AI provider.

export type ImportKind = 'positions' | 'history';
export type DateOrder = 'MDY' | 'DMY' | 'YMD';
type AssetType = 'stock' | 'crypto';

// Values arrive as the file had them (strings) or as the local AI parsed them.
export type RawImportRow = {
  symbol?: unknown;
  name?: unknown;
  qty?: unknown;
  price?: unknown;
  costBasis?: unknown;
  amount?: unknown;
  date?: unknown;
  action?: unknown;
  assetType?: unknown;
};

export type ImportOptions = {
  // Replace removes the account's positions and history first (history-only
  // imports remove history alone); add merges into what is there.
  mode: 'add' | 'replace';
  // History either replays into positions and tax lots, or is kept as a
  // record only (when positions came from a positions file).
  historyMode: 'build' | 'record';
  // Positions: cash rows set the balance. History: trades, deposits and
  // withdrawals move it.
  applyCash: boolean;
  dateOrder: DateOrder;
  defaultAssetType: AssetType;
};

export type ImportRequest = {
  accountId: string;
  kind: ImportKind;
  rows: RawImportRow[];
  options?: Partial<ImportOptions>;
  // Row indexes the user unticked in the review.
  excluded?: number[];
  fileName?: string;
};

export type RowStatus = 'ok' | 'warning' | 'error' | 'skipped' | 'duplicate' | 'excluded';

export type PlannedRow = {
  index: number;
  status: RowStatus;
  messages: string[];
  symbol?: string;
  action?: string;
  qty?: number;
  price?: number;
  date?: string;
  type?: AssetType | 'cash';
};

export type PlannedPosition = {
  symbol: string;
  name: string;
  type: AssetType;
  qty: number;
  averagePrice: number;
  lots: number;
  estimatedLots: number;
  change: 'new' | 'updated' | 'removed' | 'closed';
};

export type ImportPlan = {
  kind: ImportKind;
  options: ImportOptions;
  account: { id: string; name: string; positions: number; transactions: number; cashBalance: number };
  rows: PlannedRow[];
  positions: PlannedPosition[];
  summary: {
    rows: number;
    imported: number;
    warnings: number;
    errors: number;
    skipped: number;
    duplicates: number;
    excluded: number;
    positions: number;
    lots: number;
    estimatedLots: number;
    transactions: number;
    realizedGain: number;
    removedPositions: number;
    removedTransactions: number;
    cashBefore: number;
    cashAfter: number;
  };
  canCommit: boolean;
};

const DEFAULT_OPTIONS: ImportOptions = {
  mode: 'add',
  historyMode: 'build',
  applyCash: false,
  dateOrder: 'MDY',
  defaultAssetType: 'stock',
};

const QTY_EPS = 1e-6;
const MAX_ROWS = 20_000;
const MAX_QTY = 1e12;
const MAX_PRICE = 1e8;

// ---------------------------------------------------------------- parsing --

type Parsed<T> = { value?: T; invalid?: string };

const isBlank = (raw: unknown): boolean =>
  raw === undefined || raw === null || /^\s*(-{1,2}|n\/?a|none|null)?\s*$/i.test(String(raw));

// "$1,234.56", "(12.50)", "−3", "1 234", "USD 10": brokers format numbers every
// way; anything left that isn't a plain number is reported, never guessed.
const parseNumber = (raw: unknown): Parsed<number> => {
  if (typeof raw === 'number') return Number.isFinite(raw) ? { value: raw } : { invalid: String(raw) };
  if (isBlank(raw)) return {};
  let s = String(raw).trim();
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s
    .replace(/[−‒–—]/g, '-')
    .replace(/usd|[$€£\s,]/gi, '')
    .replace(/^\+/, '');
  if (!/^-?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return { invalid: String(raw).trim() };
  const value = Number(s);
  return { value: negative ? -Math.abs(value) : value };
};

// Strict parsing treats "M" and "MM" as different widths, so every order gets
// each padding combination ("1/5/2026", "01/05/2026", "01/5/26", …).
const dateVariants = (parts: Array<'M' | 'D' | 'Y'>, separators: string[]): string[] => {
  const widths = { M: ['M', 'MM'], D: ['D', 'DD'], Y: ['YYYY', 'YY'] };
  const out: string[] = [];
  for (const sep of separators) {
    for (const a of widths[parts[0]])
      for (const b of widths[parts[1]]) for (const c of widths[parts[2]]) out.push([a, b, c].join(sep));
  }
  return out;
};
const DATE_FORMATS: Record<DateOrder, string[]> = {
  MDY: dateVariants(['M', 'D', 'Y'], ['/', '-', '.']),
  DMY: dateVariants(['D', 'M', 'Y'], ['/', '-', '.']),
  YMD: dateVariants(['Y', 'M', 'D'], ['/', '.']),
};
const UNAMBIGUOUS_DATE_FORMATS = [
  'YYYY-MM-DD',
  'YYYY-M-D',
  'YYYY-MM-D',
  'YYYY-M-DD',
  'YYYYMMDD',
  'MMM D, YYYY',
  'MMMM D, YYYY',
  'MMM D YYYY',
  'D MMM YYYY',
  'DD MMM YYYY',
  'D-MMM-YYYY',
  'DD-MMM-YYYY',
  'D-MMM-YY',
  'DD-MMM-YY',
  'MMM DD, YYYY',
  'MMMM DD, YYYY',
];

// Returns YYYY-MM-DD. Slash dates follow the chosen order; timestamps keep
// their calendar day; "03/04/2026 as of 03/03/2026" (Schwab) uses the first.
const parseDate = (raw: unknown, order: DateOrder): Parsed<string> => {
  if (isBlank(raw)) return {};
  const s = String(raw)
    .trim()
    .split(/\s+as of\s+/i)[0]
    .trim();
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
  if (iso) return { value: iso[1] };
  const parsed = moment(s, [...DATE_FORMATS[order], ...UNAMBIGUOUS_DATE_FORMATS], true);
  if (!parsed.isValid()) return { invalid: s };
  if (parsed.year() < 1900) return { invalid: s };
  return { value: parsed.format('YYYY-MM-DD') };
};

const toIso = (day: string): string => moment(day, 'YYYY-MM-DD').toISOString();

const SYMBOL_RE = /^[A-Z0-9][A-Z0-9.\-^/]{0,19}$/;
const CRYPTO_PAIR_RE = /^([A-Z0-9]{2,10})[-/](USD|USDT|USDC)$/;
const CASH_SYMBOLS = new Set(['CASH', 'USD', 'CORE', '$']);
const CASH_NAME_RE = /^cash\b|money market|cash & cash investments|cash and cash|sweep|core position/i;
const SUMMARY_RE = /^(account )?total|grand total|pending activity|^subtotal/i;
const OPTION_RE = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b.*\b\d+(\.\d+)?\s*[CP]\b|\b(call|put)\b/i;

type SymbolInfo = { symbol: string; crypto: boolean; cashMarker: boolean; raw: string };

const cleanSymbol = (raw: unknown): SymbolInfo => {
  const rawText = String(raw ?? '').trim();
  const cashMarker = /\*\*$/.test(rawText);
  let symbol = rawText.toUpperCase().replace(/\*+$/, '').replace(/\s+/g, '');
  const pair = symbol.match(CRYPTO_PAIR_RE);
  if (pair) symbol = pair[1];
  return { symbol, crypto: !!pair, cashMarker, raw: rawText };
};

const assetTypeOf = (raw: unknown, symbol: SymbolInfo, fallback: AssetType): AssetType => {
  if (symbol.crypto) return 'crypto';
  const s = String(raw ?? '').toLowerCase();
  if (/crypto|digital|coin|token/.test(s)) return 'crypto';
  if (/stock|equity|etf|fund|share|security/.test(s)) return 'stock';
  return fallback;
};

// Cash transfers are worded as transfers (ACH, EFT, wire, "Transfer
// Received") rather than deposits. The direction comes from the amount's sign
// when it has one, otherwise from the wording; anything unclear is skipped.
const TRANSFER_RE = /transfer|\bach\b|\beft\b|\bwire\b|moneylink|funds received|funds sent|direct deposit/i;
const transferDirection = (rawAction: string, amount?: number): 'deposit' | 'withdraw' | null => {
  if (!TRANSFER_RE.test(rawAction) || /journal|security|shares/i.test(rawAction)) return null;
  if (amount !== undefined && amount !== 0) return amount > 0 ? 'deposit' : 'withdraw';
  if (/received|\bin\b|incoming|deposit/i.test(rawAction)) return 'deposit';
  if (/sent|paid|\bout\b|outgoing|withdraw/i.test(rawAction)) return 'withdraw';
  return null;
};

const fmtQty = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 8 });
const fmtUsd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ---------------------------------------------------------------- planning --

type PositionState = {
  symbol: string;
  name: string;
  type: AssetType;
  lots: ITaxLot[];
  existing?: IHoldingsModel;
  touched: boolean;
};

type PlannedTransaction = Omit<ITransaction, 'accountId'> & { imported: true; cashApplied: boolean };

type Workspace = {
  plan: ImportPlan;
  positions: Map<string, PositionState>;
  transactions: PlannedTransaction[];
  removeHoldings: IHoldingsModel[];
  removeTransactionIds: string[];
  cashTarget: { mode: 'set' | 'adjust'; amount: number } | null;
};

// Lot dates are stored as ISO instants; compare them as local calendar days.
const lotDay = (lot: Pick<ITaxLot, 'date'>) => moment(lot.date).format('YYYY-MM-DD');

const lotsEqual = (a: ITaxLot, b: ITaxLot) =>
  Math.abs(a.qty - b.qty) < QTY_EPS && Math.abs(a.price - b.price) < 1e-4 && lotDay(a) === lotDay(b);

const buildWorkspace = async (request: ImportRequest): Promise<Workspace> => {
  const options: ImportOptions = { ...DEFAULT_OPTIONS, ...(request.options ?? {}) };
  if (!['positions', 'history'].includes(request.kind)) throw new Error('kind must be "positions" or "history"');
  if (!Array.isArray(request.rows)) throw new Error('rows must be an array');
  if (request.rows.length === 0) throw new Error('The file has no rows to import');
  if (request.rows.length > MAX_ROWS) throw new Error(`Files are limited to ${MAX_ROWS.toLocaleString()} rows`);

  const [accounts, holdingsModel, txModel] = await Promise.all([
    AccountModel().initialize(),
    HoldingsModel().initialize(),
    TransactionModel().initialize(),
  ]);
  const account = accounts.findById(String(request.accountId ?? ''));
  if (!account) throw new Error('Choose an account to import into');

  const allTransactions = txModel.getAllRecords();
  const accountHoldings = holdingsModel.getAllRecords().filter((h) => h.accountId === account.id);
  const accountTransactions = allTransactions.filter((t) => t.accountId === account.id);
  const replace = options.mode === 'replace';
  const recordOnly = request.kind === 'history' && options.historyMode === 'record';
  const touchesPositions = !recordOnly;

  const positions = new Map<string, PositionState>();
  if (!(replace && touchesPositions)) {
    for (const h of accountHoldings) {
      const symbol = (h.symbol ?? '').toUpperCase();
      positions.set(symbol, {
        symbol,
        name: h.name,
        type: h.type,
        lots: resolveLots(h, allTransactions).map((l) => ({ ...l })),
        existing: h,
        touched: false,
      });
    }
  }

  const excluded = new Set(request.excluded ?? []);
  const rows: PlannedRow[] = [];
  const transactions: PlannedTransaction[] = [];
  let cashFromRows = 0;
  let hasCashRows = false;

  const duplicatesAgainst = replace ? [] : accountTransactions;

  if (request.kind === 'positions') {
    request.rows.forEach((raw, index) => {
      const row: PlannedRow = { index, status: 'ok', messages: [] };
      rows.push(row);
      if (excluded.has(index)) {
        row.status = 'excluded';
        return;
      }
      const sym = cleanSymbol(raw.symbol);
      const name = String(raw.name ?? '').trim();
      const qty = parseNumber(raw.qty);
      const price = parseNumber(raw.price);
      const costBasis = parseNumber(raw.costBasis);
      const amount = parseNumber(raw.amount);

      if (!sym.symbol && !name && qty.value === undefined) {
        row.status = 'skipped';
        row.messages.push('Empty row');
        return;
      }
      if (SUMMARY_RE.test(sym.raw) || SUMMARY_RE.test(name)) {
        row.status = 'skipped';
        row.messages.push('Summary row');
        return;
      }
      if (CASH_SYMBOLS.has(sym.symbol) || sym.cashMarker || CASH_NAME_RE.test(name) || CASH_NAME_RE.test(sym.raw)) {
        row.type = 'cash';
        row.symbol = sym.symbol || 'CASH';
        const value =
          amount.value ?? (qty.value !== undefined && price.value !== undefined ? qty.value * price.value : qty.value);
        if (value === undefined) {
          row.status = 'skipped';
          row.messages.push('Cash row without an amount');
          return;
        }
        row.qty = +value.toFixed(2);
        if (!options.applyCash) {
          row.status = 'skipped';
          row.messages.push(`Cash of ${fmtUsd(value)} — turn on "Set cash from this file" to use it`);
          return;
        }
        hasCashRows = true;
        cashFromRows += value;
        row.messages.push(`Cash balance ${fmtUsd(value)}`);
        return;
      }
      if (OPTION_RE.test(sym.raw) || OPTION_RE.test(name)) {
        row.status = 'skipped';
        row.messages.push("Options contracts aren't supported");
        return;
      }
      if (!sym.symbol) {
        row.status = 'error';
        row.messages.push('No symbol');
        return;
      }
      row.symbol = sym.symbol;
      if (!SYMBOL_RE.test(sym.symbol)) {
        row.status = 'error';
        row.messages.push(`"${sym.raw}" isn't a ticker symbol`);
        return;
      }
      row.type = assetTypeOf(raw.assetType, sym, options.defaultAssetType);

      if (qty.invalid) {
        row.status = 'error';
        row.messages.push(`Quantity "${qty.invalid}" isn't a number`);
        return;
      }
      if (qty.value === undefined) {
        row.status = 'error';
        row.messages.push('No quantity');
        return;
      }
      if (qty.value < 0) {
        row.status = 'error';
        row.messages.push("Short positions (negative quantity) aren't supported");
        return;
      }
      if (qty.value === 0) {
        row.status = 'skipped';
        row.messages.push('No shares held');
        return;
      }
      if (qty.value > MAX_QTY) {
        row.status = 'error';
        row.messages.push('Quantity is implausibly large');
        return;
      }
      row.qty = roundQty(qty.value);

      if (price.invalid || costBasis.invalid) {
        row.status = 'error';
        row.messages.push(`Cost "${price.invalid ?? costBasis.invalid}" isn't a number`);
        return;
      }
      const perShare =
        price.value !== undefined
          ? Math.abs(price.value)
          : costBasis.value !== undefined
            ? Math.abs(costBasis.value) / qty.value
            : undefined;
      if (perShare === undefined) {
        row.status = 'error';
        row.messages.push(
          'No cost basis — gains and tax lots need it. Add an average cost or total cost column, or untick this row'
        );
        return;
      }
      if (perShare > MAX_PRICE) {
        row.status = 'error';
        row.messages.push('Cost per share is implausibly large');
        return;
      }
      row.price = +perShare.toFixed(6);
      if (perShare === 0) {
        row.status = 'warning';
        row.messages.push('Cost basis is $0, so the whole value will count as gain');
      }

      const date = parseDate(raw.date, options.dateOrder);
      if (date.invalid) {
        row.status = 'error';
        row.messages.push(`Couldn't read the date "${date.invalid}" — check the date format`);
        return;
      }
      if (date.value && moment(date.value).isAfter(moment(), 'day')) {
        row.status = 'error';
        row.messages.push(`Purchase date ${date.value} is in the future`);
        return;
      }
      row.date = date.value;
      if (!date.value) {
        row.status = 'warning';
        row.messages.push(
          'No purchase date — the lot is marked estimated; set its date on the Research page for accurate tax terms'
        );
      }

      const lot: ITaxLot = {
        id: randomUUID(),
        qty: row.qty,
        price: row.price,
        date: date.value ? toIso(date.value) : moment().toISOString(),
        ...(!date.value && { estimated: true }),
      };
      const state = positions.get(sym.symbol);
      if (state && !replace && date.value && state.lots.some((l) => lotsEqual(l, lot))) {
        row.status = 'duplicate';
        row.messages.push('Already in this account (same quantity, cost and date)');
        return;
      }
      if (state && state.type !== row.type) {
        row.status = 'warning';
        row.messages.push(`Already held here as ${state.type}; keeping that`);
      }
      const target: PositionState = state ?? {
        symbol: sym.symbol,
        name: name || sym.symbol,
        type: row.type,
        lots: [],
        touched: false,
      };
      if (name && (target.name === target.symbol || !target.name)) target.name = name;
      target.lots.push(lot);
      target.touched = true;
      positions.set(sym.symbol, target);
    });
  } else {
    type Event = { row: PlannedRow; action: 'buy' | 'sell'; type: AssetType; name: string };
    const events: Event[] = [];

    request.rows.forEach((raw, index) => {
      const row: PlannedRow = { index, status: 'ok', messages: [] };
      rows.push(row);
      if (excluded.has(index)) {
        row.status = 'excluded';
        return;
      }
      const sym = cleanSymbol(raw.symbol);
      const name = String(raw.name ?? '').trim();
      const rawAction = String(raw.action ?? '').trim();
      if (!rawAction && !sym.symbol && isBlank(raw.qty) && isBlank(raw.amount)) {
        row.status = 'skipped';
        row.messages.push('Empty row');
        return;
      }
      if (!rawAction) {
        row.status = 'error';
        row.messages.push('No action — each row needs buy, sell, deposit or withdrawal');
        return;
      }
      const signedAmount = parseNumber(raw.amount).value;
      const action =
        normalizeTradeAction(rawAction) ?? (sym.symbol ? null : transferDirection(rawAction, signedAmount));
      if (!action) {
        row.status = 'skipped';
        row.messages.push(
          /send|receive|transfer/i.test(rawAction) && sym.symbol
            ? `"${rawAction}" moves ${sym.symbol} in or out without a price — shares or coins transferred in need their cost basis, so import them from a positions file`
            : `"${rawAction}" isn't a buy, sell, deposit or withdrawal`
        );
        return;
      }
      row.action = action;

      const date = parseDate(raw.date, options.dateOrder);
      if (date.invalid) {
        row.status = 'error';
        row.messages.push(`Couldn't read the date "${date.invalid}" — check the date format`);
        return;
      }
      if (date.value && moment(date.value).isAfter(moment(), 'day')) {
        row.status = 'error';
        row.messages.push(`Date ${date.value} is in the future`);
        return;
      }
      row.date = date.value;
      if (!date.value) {
        if (!recordOnly) {
          row.status = 'error';
          row.messages.push('No date — building positions needs the date of every trade');
          return;
        }
        row.status = 'warning';
        row.messages.push("No date — it will be recorded as today's");
      }

      const qty = parseNumber(raw.qty);
      const price = parseNumber(raw.price);
      const amount = parseNumber(raw.amount);
      const bad = qty.invalid ?? price.invalid ?? amount.invalid;
      if (bad) {
        row.status = 'error';
        row.messages.push(`"${bad}" isn't a number`);
        return;
      }

      if (action === 'deposit' || action === 'withdraw') {
        const value =
          amount.value !== undefined
            ? Math.abs(amount.value)
            : qty.value !== undefined
              ? Math.abs(qty.value) * (price.value !== undefined ? Math.abs(price.value) : 1)
              : undefined;
        if (!value) {
          row.status = 'error';
          row.messages.push('No amount');
          return;
        }
        row.symbol = 'CASH';
        row.type = 'cash';
        row.qty = +value.toFixed(2);
        row.price = 1;
        transactions.push({
          symbol: 'CASH',
          qty: row.qty,
          price: 1,
          type: 'cash',
          action,
          date: toIso(date.value ?? moment().format('YYYY-MM-DD')),
          imported: true,
          cashApplied: options.applyCash,
        });
        return;
      }

      if (OPTION_RE.test(sym.raw) || OPTION_RE.test(name)) {
        row.status = 'skipped';
        row.messages.push("Options contracts aren't supported");
        return;
      }
      if (!sym.symbol) {
        row.status = 'error';
        row.messages.push(`No symbol for this ${action}`);
        return;
      }
      row.symbol = sym.symbol;
      if (!SYMBOL_RE.test(sym.symbol)) {
        row.status = 'error';
        row.messages.push(`"${sym.raw}" isn't a ticker symbol`);
        return;
      }
      row.type = assetTypeOf(raw.assetType, sym, options.defaultAssetType);
      if (qty.value === undefined || qty.value === 0) {
        row.status = 'error';
        row.messages.push('No quantity');
        return;
      }
      const shares = Math.abs(qty.value);
      if (shares > MAX_QTY) {
        row.status = 'error';
        row.messages.push('Quantity is implausibly large');
        return;
      }
      const perShare =
        price.value !== undefined && price.value !== 0
          ? Math.abs(price.value)
          : amount.value !== undefined && amount.value !== 0
            ? Math.abs(amount.value) / shares
            : undefined;
      if (perShare === undefined) {
        row.status = 'error';
        row.messages.push('No price — add a price or amount column');
        return;
      }
      if (perShare > MAX_PRICE) {
        row.status = 'error';
        row.messages.push('Price is implausibly large');
        return;
      }
      row.qty = roundQty(shares);
      row.price = +perShare.toFixed(6);

      const day = date.value ?? moment().format('YYYY-MM-DD');
      const duplicate = duplicatesAgainst.some(
        (t) =>
          t.action === action &&
          (t.symbol ?? '').toUpperCase() === sym.symbol &&
          Math.abs((t.qty ?? 0) - (row.qty as number)) < QTY_EPS &&
          Math.abs((t.price ?? 0) - (row.price as number)) < 1e-4 &&
          moment(t.date ?? t.createdAt).format('YYYY-MM-DD') === day
      );
      if (duplicate) {
        row.status = 'duplicate';
        row.messages.push('Already in this account (same trade on the same day)');
        return;
      }
      events.push({ row, action, type: row.type, name });
    });

    // Cash rows above were planned in file order; trades replay oldest first,
    // buys before sells on the same day (a same-day sale needs the purchase).
    events.sort(
      (a, b) =>
        (a.row.date ?? '').localeCompare(b.row.date ?? '') ||
        (a.action === b.action ? 0 : a.action === 'buy' ? -1 : 1) ||
        a.row.index - b.row.index
    );

    for (const event of events) {
      const { row } = event;
      const symbol = row.symbol as string;
      const qty = row.qty as number;
      const price = row.price as number;
      const iso = toIso(row.date ?? moment().format('YYYY-MM-DD'));

      if (recordOnly) {
        transactions.push({
          symbol,
          qty,
          price,
          type: event.type,
          action: event.action,
          date: iso,
          imported: true,
          cashApplied: options.applyCash,
        });
        continue;
      }

      const state: PositionState = positions.get(symbol) ?? {
        symbol,
        name: event.name || symbol,
        type: event.type,
        lots: [],
        touched: false,
      };
      if (event.name && state.name === state.symbol) state.name = event.name;
      positions.set(symbol, state);

      if (event.action === 'buy') {
        const lot: ITaxLot = { id: randomUUID(), qty, price, date: iso };
        state.lots.push(lot);
        state.touched = true;
        transactions.push({
          symbol,
          qty,
          price,
          type: state.type,
          action: 'buy',
          date: iso,
          lotId: lot.id,
          imported: true,
          cashApplied: options.applyCash,
        });
        continue;
      }

      const eligible = state.lots
        .filter((l) => l.qty > QTY_EPS && lotDay(l) <= (row.date as string))
        .sort((a, b) => a.date.localeCompare(b.date));
      const held = eligible.reduce((s, l) => s + l.qty, 0);
      if (held + QTY_EPS < qty) {
        row.status = 'error';
        row.messages.push(
          `Sells ${fmtQty(qty)} ${symbol} on ${row.date}, but the file only shows ${fmtQty(roundQty(held))} held by then. ` +
            'The history probably starts after your first purchase — import your current positions instead, or include the earlier history'
        );
        continue;
      }
      let remaining = qty;
      const relieved: IRelievedLot[] = [];
      let pnl = 0;
      for (const lot of eligible) {
        if (remaining <= QTY_EPS) break;
        const taken = Math.min(remaining, lot.qty);
        relieved.push({ lotId: lot.id, qty: roundQty(taken), price: lot.price, date: lot.date });
        pnl += (price - lot.price) * taken;
        lot.qty = roundQty(lot.qty - taken);
        remaining = roundQty(remaining - taken);
      }
      state.lots = state.lots.filter((l) => l.qty > QTY_EPS);
      state.touched = true;
      transactions.push({
        symbol,
        qty,
        price,
        type: state.type,
        action: 'sell',
        date: iso,
        pnl: +pnl.toFixed(2),
        lots: relieved,
        imported: true,
        cashApplied: options.applyCash,
      });
    }
  }

  // ------------------------------------------------------------ summary --

  const removeHoldings = replace && touchesPositions ? accountHoldings : [];
  const removeTransactionIds = replace ? accountTransactions.map((t) => t.id) : [];

  let cashTarget: Workspace['cashTarget'] = null;
  if (request.kind === 'positions') {
    if (hasCashRows) cashTarget = { mode: replace ? 'set' : 'adjust', amount: +cashFromRows.toFixed(2) };
  } else if (options.applyCash) {
    const flow = transactions.reduce((sum, t) => {
      const gross = t.qty * (t.price ?? 0);
      return sum + (t.action === 'sell' || t.action === 'deposit' ? gross : -gross);
    }, 0);
    cashTarget = { mode: replace ? 'set' : 'adjust', amount: +flow.toFixed(2) };
  }
  const cashBefore = account.cashBalance ?? 0;
  const cashAfter = cashTarget
    ? +(cashTarget.mode === 'set' ? cashTarget.amount : cashBefore + cashTarget.amount).toFixed(2)
    : cashBefore;

  const plannedPositions: PlannedPosition[] = [];
  for (const state of positions.values()) {
    if (!state.touched) continue;
    const { qty, averagePrice } = totalsFromLots(state.lots);
    plannedPositions.push({
      symbol: state.symbol,
      name: state.name,
      type: state.type,
      qty,
      averagePrice: +averagePrice.toFixed(4),
      lots: state.lots.length,
      estimatedLots: state.lots.filter((l) => l.estimated).length,
      change: qty <= QTY_EPS ? 'closed' : state.existing ? 'updated' : 'new',
    });
  }
  for (const h of removeHoldings) {
    if (!positions.has((h.symbol ?? '').toUpperCase())) {
      plannedPositions.push({
        symbol: h.symbol,
        name: h.name,
        type: h.type,
        qty: h.qty,
        averagePrice: h.averagePrice,
        lots: h.lots?.length ?? 1,
        estimatedLots: 0,
        change: 'removed',
      });
    }
  }
  plannedPositions.sort((a, b) => a.symbol.localeCompare(b.symbol));

  const count = (status: RowStatus) => rows.filter((r) => r.status === status).length;
  const open = plannedPositions.filter((p) => p.change === 'new' || p.change === 'updated');
  const errors = count('error');
  const summary: ImportPlan['summary'] = {
    rows: rows.length,
    imported: count('ok') + count('warning'),
    warnings: count('warning'),
    errors,
    skipped: count('skipped'),
    duplicates: count('duplicate'),
    excluded: count('excluded'),
    positions: open.length,
    lots: open.reduce((s, p) => s + p.lots, 0),
    estimatedLots: open.reduce((s, p) => s + p.estimatedLots, 0),
    transactions: transactions.length,
    realizedGain: +transactions.reduce((s, t) => s + (t.pnl ?? 0), 0).toFixed(2),
    removedPositions: removeHoldings.length,
    removedTransactions: removeTransactionIds.length,
    cashBefore,
    cashAfter,
  };

  const plan: ImportPlan = {
    kind: request.kind,
    options,
    account: {
      id: account.id,
      name: account.name,
      positions: accountHoldings.length,
      transactions: accountTransactions.length,
      cashBalance: cashBefore,
    },
    rows,
    positions: plannedPositions,
    summary,
    canCommit: errors === 0 && (summary.imported > 0 || cashTarget !== null),
  };

  return { plan, positions, transactions, removeHoldings, removeTransactionIds, cashTarget };
};

export const previewImport = async (request: ImportRequest): Promise<ImportPlan> =>
  (await buildWorkspace(request)).plan;

export const commitImport = async (request: ImportRequest): Promise<ImportPlan> => {
  const work = await buildWorkspace(request);
  const { plan } = work;
  if (!plan.canCommit) {
    throw new Error(
      plan.summary.errors > 0
        ? `${plan.summary.errors} row(s) have problems — fix them in the file or untick them, then import again`
        : 'Nothing to import'
    );
  }

  const accountId = plan.account.id;
  const [holdingsModel, txModel] = await Promise.all([HoldingsModel().initialize(), TransactionModel().initialize()]);

  for (const h of work.removeHoldings) await holdingsModel.deleteById(h.id);
  for (const id of work.removeTransactionIds) await txModel.deleteById(id);

  for (const state of work.positions.values()) {
    if (!state.touched) continue;
    const open = state.lots.filter((l) => l.qty > QTY_EPS);
    const existing = state.existing && !work.removeHoldings.includes(state.existing) ? state.existing : undefined;
    if (!open.length) {
      if (existing) await holdingsModel.deleteById(existing.id);
      continue;
    }
    const fields = { name: state.name, lots: open, ...totalsFromLots(open) };
    if (existing) await holdingsModel.updateById(existing.id, fields);
    else await holdingsModel.insertOne({ accountId, symbol: state.symbol, type: state.type, ...fields });
  }

  if (work.transactions.length) {
    await txModel.insertMany(work.transactions.map((t) => ({ ...t, accountId })));
  }

  if (work.cashTarget) await adjustCash(accountId, plan.summary.cashAfter - plan.summary.cashBefore);

  await (await ImportRunDBModel().initialize()).insertOne({
    accountId,
    kind: plan.kind,
    mode: plan.options.mode,
    ...(plan.kind === 'history' && { historyMode: plan.options.historyMode }),
    ...(request.fileName && { fileName: String(request.fileName).slice(0, 200) }),
    positions: plan.summary.positions,
    lots: plan.summary.lots,
    transactions: plan.summary.transactions,
    skipped: plan.summary.skipped + plan.summary.duplicates + plan.summary.excluded,
    cashChange: +(plan.summary.cashAfter - plan.summary.cashBefore).toFixed(2),
  });

  return plan;
};

export const listImportRuns = async () =>
  (await ImportRunDBModel().initialize())
    .getAllRecords()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);
