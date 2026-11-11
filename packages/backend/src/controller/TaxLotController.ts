import moment from 'moment';
import { AccountModel, isTaxableAccount } from '../models/AccountModel';
import { HoldingsModel, IHoldingsModel, ITaxLot } from '../models/HoldingsModel';
import { ITaxConfig } from '../models/TaxConfigModel';
import { ITransaction, ITransactionModel, TransactionModel } from '../models/TransactionModel';
import { roundQty } from '../utils';
import { createDashboard } from './DashboardController';

// Accounts whose gains aren't taxed on sale (Roth, traditional IRA, 401(k)).
// Holdings whose account no longer exists count as taxable.
export const nonTaxableAccountIds = async (): Promise<Set<string>> =>
  new Set(
    (await AccountModel().initialize())
      .getAllRecords()
      .filter((a) => !isTaxableAccount(a))
      .map((a) => a.id)
  );

export type LotMethod = 'fifo' | 'lifo' | 'hifo' | 'taxOptimal' | 'specific';
export const LOT_METHODS: LotMethod[] = ['fifo', 'lifo', 'hifo', 'taxOptimal', 'specific'];

export type Term = 'short' | 'long';

export type TaxLotView = ITaxLot & {
  costBasis: number;
  marketValue: number;
  gain: number;
  gainPercent: number;
  term: Term;
  longTermDate: string;
  daysToLongTerm: number;
};

export type PositionTaxSummary = {
  shortTermGain: number;
  longTermGain: number;
  shortTermQty: number;
  longTermQty: number;
  estimatedTax: number;
  hasEstimatedLots: boolean;
  nextLongTerm: { date: string; daysAway: number; qty: number; gain: number; taxSaving: number } | null;
};

export type TaxEstimate = {
  federal: number;
  state: number;
  total: number;
  lossDeduction: number;
  carryforward: number;
};

type TradeLike = Pick<ITransaction, 'accountId' | 'symbol' | 'qty' | 'price' | 'action' | 'date' | 'lotId' | 'lots'> & {
  id?: string;
  createdAt?: string;
};

const QTY_EPS = 1e-6;
// Net capital losses offset at most this much ordinary income per year; the rest carries forward.
const LOSS_DEDUCTION_LIMIT = 3000;

const round2 = (n: number) => +n.toFixed(2);

// Imported rows carry `date`; otherwise fall back to the insert timestamp.
export const tradeDate = (t: { date?: string; createdAt?: string }): string =>
  t.date || t.createdAt || moment().toISOString();

// A holding period is long-term once it runs more than one year, i.e. from the
// day after the purchase anniversary.
export const longTermDate = (acquired: string): moment.Moment =>
  moment(acquired).startOf('day').add(1, 'year').add(1, 'day');

export const lotTerm = (acquired: string, asOf: moment.MomentInput = moment()): Term =>
  moment(asOf).isSameOrAfter(longTermDate(acquired), 'day') ? 'long' : 'short';

export const totalsFromLots = (lots: ITaxLot[]): { qty: number; averagePrice: number } => {
  const qty = roundQty(lots.reduce((s, l) => s + l.qty, 0));
  const cost = lots.reduce((s, l) => s + l.qty * l.price, 0);
  return { qty, averagePrice: qty > 0 ? cost / qty : 0 };
};

const sortLots = (lots: ITaxLot[]): ITaxLot[] =>
  [...lots].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

const matchesTotals = (lots: ITaxLot[], holding: Pick<IHoldingsModel, 'qty' | 'averagePrice'>): boolean => {
  const totals = totalsFromLots(lots);
  if (Math.abs(totals.qty - holding.qty) > QTY_EPS) return false;
  const avg = holding.averagePrice ?? 0;
  return Math.abs(totals.averagePrice - avg) <= Math.max(0.005 * Math.abs(avg), 0.01);
};

const consume = (queue: ITaxLot[], qty: number, lotId?: string): void => {
  let remaining = qty;
  if (lotId) {
    const lot = queue.find((l) => l.id === lotId);
    if (lot) {
      const taken = Math.min(remaining, lot.qty);
      lot.qty = roundQty(lot.qty - taken);
      remaining -= taken;
    }
  }
  while (remaining > QTY_EPS && queue.some((l) => l.qty > QTY_EPS)) {
    const lot = queue.find((l) => l.qty > QTY_EPS) as ITaxLot;
    const taken = Math.min(remaining, lot.qty);
    lot.qty = roundQty(lot.qty - taken);
    remaining -= taken;
  }
};

// Rebuilds open lots for a holding that predates lot tracking by replaying its
// trade log. When the log doesn't reconcile with the stored quantity (positions
// imported without history), the whole position becomes one estimated lot.
const reconstructLots = (holding: IHoldingsModel, transactions: TradeLike[]): ITaxLot[] => {
  const symbol = holding.symbol.toUpperCase();
  const trades = transactions
    .filter(
      (t) =>
        t.accountId === holding.accountId &&
        (t.symbol ?? '').toUpperCase() === symbol &&
        (t.action === 'buy' || t.action === 'sell')
    )
    .sort((a, b) => tradeDate(a).localeCompare(tradeDate(b)));

  const queue: ITaxLot[] = [];
  for (const t of trades) {
    if (t.action === 'buy') {
      queue.push({
        id: t.lotId || t.id || `${holding.id}:${tradeDate(t)}`,
        qty: t.qty,
        price: t.price ?? 0,
        date: tradeDate(t),
      });
    } else if (t.lots?.length) {
      for (const relieved of t.lots) consume(queue, relieved.qty, relieved.lotId);
    } else {
      consume(queue, t.qty);
    }
  }
  const open = queue.filter((l) => l.qty > QTY_EPS);

  if (open.length && matchesTotals(open, holding)) return open;

  // Quantities reconcile but the stored average cost was edited or came from
  // average-cost selling: keep the recorded dates, price every lot at the average.
  if (open.length && Math.abs(totalsFromLots(open).qty - holding.qty) <= QTY_EPS) {
    return open.map((l) => ({ ...l, price: holding.averagePrice, estimated: true }));
  }

  const firstBuy = trades.find((t) => t.action === 'buy');
  return [
    {
      id: `${holding.id}:opening`,
      qty: holding.qty,
      price: holding.averagePrice ?? 0,
      date: firstBuy ? tradeDate(firstBuy) : holding.createdAt || moment().toISOString(),
      estimated: true,
    },
  ];
};

export const resolveLots = (holding: IHoldingsModel, transactions: TradeLike[]): ITaxLot[] => {
  if (holding.lots?.length && matchesTotals(holding.lots, holding)) return sortLots(holding.lots);
  return sortLots(reconstructLots(holding, transactions));
};

const combinedRate = (term: Term, config: ITaxConfig): number =>
  ((term === 'long' ? config.longTermRate : config.shortTermRate) + config.stateRate) / 100;

export type LotSelection = { lot: ITaxLot; qty: number };

export const selectLots = (
  lots: ITaxLot[],
  qty: number,
  method: LotMethod,
  opts: { salePrice: number; saleDate: moment.MomentInput; config: ITaxConfig; lotIds?: string[] }
): { relieved: LotSelection[]; remaining: ITaxLot[] } => {
  const taxPerShare = (lot: ITaxLot) =>
    (opts.salePrice - lot.price) * combinedRate(lotTerm(lot.date, opts.saleDate), opts.config);

  let ordered: ITaxLot[];
  switch (method) {
    case 'lifo':
      ordered = [...lots].sort((a, b) => b.date.localeCompare(a.date));
      break;
    case 'hifo':
      ordered = [...lots].sort((a, b) => b.price - a.price || a.date.localeCompare(b.date));
      break;
    case 'taxOptimal':
      ordered = [...lots].sort((a, b) => taxPerShare(a) - taxPerShare(b) || b.price - a.price);
      break;
    case 'specific': {
      const ids = opts.lotIds ?? [];
      ordered = ids.map((id) => lots.find((l) => l.id === id)).filter((l): l is ITaxLot => !!l);
      if (!ordered.length) throw new Error('Choose at least one lot to sell');
      const available = totalsFromLots(ordered).qty;
      if (available + QTY_EPS < qty) {
        throw new Error(`The selected lots hold ${available} shares — fewer than the ${qty} being sold`);
      }
      break;
    }
    default:
      ordered = sortLots(lots);
  }

  const relieved: LotSelection[] = [];
  const taken = new Map<string, number>();
  let remaining = qty;
  for (const lot of ordered) {
    if (remaining <= QTY_EPS) break;
    const q = roundQty(Math.min(remaining, lot.qty));
    if (q <= 0) continue;
    relieved.push({ lot, qty: q });
    taken.set(lot.id, q);
    remaining = roundQty(remaining - q);
  }
  if (remaining > QTY_EPS) throw new Error('You cannot sell more than you own!');

  const left = lots
    .map((l) => ({ ...l, qty: roundQty(l.qty - (taken.get(l.id) ?? 0)) }))
    .filter((l) => l.qty > QTY_EPS);
  return { relieved, remaining: sortLots(left) };
};

// Simplified US netting: short- and long-term results offset each other, a net
// gain keeps the character of whichever side is left, and a net loss deducts
// up to $3,000 against ordinary income with the remainder carried forward.
export const estimateTax = (shortTerm: number, longTerm: number, config: ITaxConfig): TaxEstimate => {
  const net = shortTerm + longTerm;
  const st = config.shortTermRate / 100;
  const lt = config.longTermRate / 100;
  const state = config.stateRate / 100;

  if (net <= 0) {
    const lossDeduction = Math.min(LOSS_DEDUCTION_LIMIT, -net);
    return {
      federal: round2(-lossDeduction * st),
      state: round2(-lossDeduction * state),
      total: round2(-lossDeduction * (st + state)),
      lossDeduction: round2(lossDeduction),
      carryforward: round2(-net - lossDeduction),
    };
  }

  let federal: number;
  if (shortTerm >= 0 && longTerm >= 0) federal = shortTerm * st + longTerm * lt;
  else if (shortTerm > 0) federal = net * st;
  else federal = net * lt;

  return {
    federal: round2(federal),
    state: round2(net * state),
    total: round2(federal + net * state),
    lossDeduction: 0,
    carryforward: 0,
  };
};

// Extra tax a set of gains adds on top of what's already been realized that year.
export const marginalTax = (
  base: { shortTerm: number; longTerm: number },
  added: { shortTerm: number; longTerm: number },
  config: ITaxConfig
): TaxEstimate => {
  const before = estimateTax(base.shortTerm, base.longTerm, config);
  const after = estimateTax(base.shortTerm + added.shortTerm, base.longTerm + added.longTerm, config);
  return {
    federal: round2(after.federal - before.federal),
    state: round2(after.state - before.state),
    total: round2(after.total - before.total),
    lossDeduction: round2(after.lossDeduction - before.lossDeduction),
    carryforward: round2(after.carryforward - before.carryforward),
  };
};

export const enrichLots = (lots: ITaxLot[], currentPrice: number, asOf: moment.MomentInput = moment()): TaxLotView[] =>
  lots.map((lot) => {
    const costBasis = lot.qty * lot.price;
    const marketValue = lot.qty * currentPrice;
    const gain = marketValue - costBasis;
    const ltDate = longTermDate(lot.date);
    const term = lotTerm(lot.date, asOf);
    return {
      ...lot,
      costBasis: round2(costBasis),
      marketValue: round2(marketValue),
      gain: round2(gain),
      gainPercent: costBasis ? round2((gain / costBasis) * 100) : 0,
      term,
      longTermDate: ltDate.format('YYYY-MM-DD'),
      daysToLongTerm: term === 'long' ? 0 : Math.max(0, ltDate.diff(moment(asOf).startOf('day'), 'days')),
    };
  });

export const summarizeLots = (lots: TaxLotView[], config: ITaxConfig): PositionTaxSummary => {
  const st = lots.filter((l) => l.term === 'short');
  const lt = lots.filter((l) => l.term === 'long');
  const shortTermGain = round2(st.reduce((s, l) => s + l.gain, 0));
  const longTermGain = round2(lt.reduce((s, l) => s + l.gain, 0));

  const next = st.filter((l) => l.gain > 0).sort((a, b) => a.daysToLongTerm - b.daysToLongTerm)[0];
  const sameDay = next ? st.filter((l) => l.gain > 0 && l.longTermDate === next.longTermDate) : [];
  const nextGain = sameDay.reduce((s, l) => s + l.gain, 0);

  return {
    shortTermGain,
    longTermGain,
    shortTermQty: roundQty(st.reduce((s, l) => s + l.qty, 0)),
    longTermQty: roundQty(lt.reduce((s, l) => s + l.qty, 0)),
    estimatedTax: estimateTax(shortTermGain, longTermGain, config).total,
    hasEstimatedLots: lots.some((l) => l.estimated),
    nextLongTerm: next
      ? {
          date: next.longTermDate,
          daysAway: next.daysToLongTerm,
          qty: roundQty(sameDay.reduce((s, l) => s + l.qty, 0)),
          gain: round2(nextGain),
          taxSaving: round2((nextGain * (config.shortTermRate - config.longTermRate)) / 100),
        }
      : null,
  };
};

export type PositionWithLots = {
  holding: IHoldingsModel;
  lots: ITaxLot[];
  currentPrice: number | null;
};

// Every holding with its resolved lots and live price (null when unpriced).
export const loadPositionsWithLots = async (): Promise<{
  positions: PositionWithLots[];
  transactions: ITransactionModel[];
}> => {
  const [dashboard, holdingsModel, txModel] = await Promise.all([
    createDashboard(),
    HoldingsModel().initialize(),
    TransactionModel().initialize(),
  ]);
  const transactions = txModel.getAllRecords();
  const prices = new Map<string, number>();
  for (const row of dashboard as Array<{ symbol: string; currentPrice: number; priceUnavailable?: boolean }>) {
    if (!row.priceUnavailable) prices.set(row.symbol, row.currentPrice);
  }
  const positions = holdingsModel.getAllRecords().map((holding) => ({
    holding,
    lots: resolveLots(holding, transactions),
    currentPrice: prices.get(holding.symbol) ?? null,
  }));
  return { positions, transactions };
};
