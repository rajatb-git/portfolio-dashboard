import moment from 'moment';
import { AccountModel } from '../models/AccountModel';
import { ITaxLot } from '../models/HoldingsModel';
import { getTaxConfig, ITaxConfig } from '../models/TaxConfigModel';
import { roundQty } from '../utils';
import { getQuote } from '../marketData/quotes';
import { calculateRealizedGains } from './RealizedGainsController';
import {
  enrichLots,
  LotMethod,
  LotSelection,
  loadPositionsWithLots,
  longTermDate,
  lotTerm,
  marginalTax,
  selectLots,
  TaxEstimate,
  Term,
  totalsFromLots,
  tradeDate,
} from './TaxLotController';

export type SimulationInput = {
  action: 'buy' | 'sell';
  accountId: string;
  symbol: string;
  qty: number;
  price?: number;
  date?: string;
  type?: 'stock' | 'crypto';
  lotMethod?: LotMethod;
  lotIds?: string[];
};

type SimulatedLot = {
  lotId: string;
  acquired: string;
  qty: number;
  costPerShare: number;
  costBasis: number;
  proceeds: number;
  gain: number;
  term: Term;
  longTermDate: string;
  estimated: boolean;
};

type MethodOutcome = {
  method: LotMethod;
  shortTermGain: number;
  longTermGain: number;
  gain: number;
  tax: number;
};

type PositionState = {
  qty: number;
  averagePrice: number;
  costBasis: number;
  marketValue: number;
  unrealizedGain: number;
  shortTermGain: number;
  longTermGain: number;
};

type WashSale = { triggered: boolean; disallowedLoss: number; replacementQty: number; message: string };

type Note = { severity: 'info' | 'warning' | 'success'; message: string };

export type TradeSimulation = {
  action: 'buy' | 'sell';
  symbol: string;
  name: string;
  accountId: string;
  type: 'stock' | 'crypto';
  qty: number;
  price: number;
  date: string;
  lotMethod: LotMethod | null;
  amount: number;
  costBasis: number | null;
  realized: { shortTerm: number; longTerm: number; total: number } | null;
  tax: (TaxEstimate & { ytdShortTerm: number; ytdLongTerm: number }) | null;
  netProceeds: number | null;
  lots: SimulatedLot[];
  comparison: MethodOutcome[];
  washSale: WashSale | null;
  waitForLongTerm: { date: string; daysAway: number; qty: number; taxSaving: number } | null;
  position: { before: PositionState | null; after: PositionState | null };
  portfolioWeight: { before: number; after: number };
  cash: { before: number; after: number };
  notes: Note[];
  config: ITaxConfig;
};

const WASH_SALE_DAYS = 30;
const COMPARED_METHODS: LotMethod[] = ['fifo', 'lifo', 'hifo', 'taxOptimal'];
const METHOD_LABELS: Record<LotMethod, string> = {
  fifo: 'FIFO',
  lifo: 'LIFO',
  hifo: 'Highest cost',
  taxOptimal: 'Tax-optimized',
  specific: 'Specific lots',
};

const round2 = (n: number) => +n.toFixed(2);
const usd = (n: number) => `$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const positionState = (lots: ITaxLot[], price: number, asOf: moment.Moment): PositionState | null => {
  if (!lots.length) return null;
  const views = enrichLots(lots, price, asOf);
  const { qty, averagePrice } = totalsFromLots(lots);
  const costBasis = views.reduce((s, l) => s + l.costBasis, 0);
  const marketValue = views.reduce((s, l) => s + l.marketValue, 0);
  return {
    qty,
    averagePrice: round2(averagePrice),
    costBasis: round2(costBasis),
    marketValue: round2(marketValue),
    unrealizedGain: round2(marketValue - costBasis),
    shortTermGain: round2(views.filter((l) => l.term === 'short').reduce((s, l) => s + l.gain, 0)),
    longTermGain: round2(views.filter((l) => l.term === 'long').reduce((s, l) => s + l.gain, 0)),
  };
};

const parseDate = (value?: string): moment.Moment => {
  if (!value) return moment();
  const parsed = moment(value, ['YYYY-MM-DD', moment.ISO_8601], true);
  if (!parsed.isValid()) throw new Error(`"${value}" is not a valid date`);
  return parsed;
};

export const simulateTrade = async (input: SimulationInput): Promise<TradeSimulation> => {
  const symbol = String(input.symbol ?? '')
    .trim()
    .toUpperCase();
  if (!symbol) throw new Error('Symbol is required');
  const qty = roundQty(Number(input.qty));
  if (!Number.isFinite(qty) || qty <= 0) throw new Error('Quantity must be a positive number');
  if (input.action !== 'buy' && input.action !== 'sell') throw new Error('Action must be buy or sell');

  const accountsModel = await AccountModel().initialize();
  const account = accountsModel.findById(input.accountId);
  if (!account) throw new Error(`Account ${input.accountId} not found`);

  const [config, realized, { positions, transactions }] = await Promise.all([
    getTaxConfig(),
    calculateRealizedGains(),
    loadPositionsWithLots(),
  ]);

  const sameSymbol = positions.filter((p) => p.holding.symbol.toUpperCase() === symbol);
  const position = sameSymbol.find((p) => p.holding.accountId === input.accountId);
  const type = position?.holding.type ?? sameSymbol[0]?.holding.type ?? input.type ?? 'stock';

  const quote = await getQuote(symbol, type === 'crypto').catch(() => null);
  let price = input.price !== undefined && input.price !== null ? Number(input.price) : NaN;
  if (input.price === undefined || input.price === null) {
    if (!quote) throw new Error(`No live quote is available for ${symbol} — enter a price to simulate`);
    price = quote.price;
  }
  if (!Number.isFinite(price) || price < 0) throw new Error('Price must be zero or a positive number');
  // The trade happens at `price`; what the position is worth before and after is
  // still today's market price, or a hypothetical fill would revalue every share
  // already held.
  const marketPrice = quote?.price ?? price;

  const date = parseDate(input.date);
  const ytdRow = realized.byYear.find((y) => y.year === date.year());
  const ytd = { shortTerm: ytdRow?.shortTermGain ?? 0, longTerm: ytdRow?.longTermGain ?? 0 };

  const cashBalance = account.cashBalance ?? 0;
  const totalCash = accountsModel.getAllRecords().reduce((s, a) => s + (a.cashBalance ?? 0), 0);
  const symbolValue = (lots: ITaxLot[]) => totalsFromLots(lots).qty * marketPrice;
  const otherValue = positions
    .filter((p) => p.holding.symbol.toUpperCase() !== symbol)
    .reduce((s, p) => s + p.holding.qty * (p.currentPrice ?? p.holding.averagePrice ?? 0), 0);
  const symbolLotsElsewhere = sameSymbol.filter((p) => p !== position).flatMap((p) => p.lots);
  const currentLots = position?.lots ?? [];
  // Trades only move money between cash and the position, so the total is the same before and after.
  const portfolioTotal = otherValue + symbolValue([...symbolLotsElsewhere, ...currentLots]) + totalCash;
  const weight = (lots: ITaxLot[]) =>
    portfolioTotal > 0 ? round2((symbolValue([...symbolLotsElsewhere, ...lots]) / portfolioTotal) * 100) : 0;

  const notes: Note[] = [];
  const name = position?.holding.name ?? sameSymbol[0]?.holding.name ?? symbol;
  const base = {
    action: input.action,
    symbol,
    name,
    accountId: input.accountId,
    type,
    qty,
    price: round2(price),
    date: date.format('YYYY-MM-DD'),
    config,
  };

  if (date.isAfter(moment(), 'day')) {
    notes.push({
      severity: 'info',
      message: `Simulated for ${date.format('MMM D, YYYY')} at ${usd(price)}/share — holding periods are measured to that date.`,
    });
  }

  if (input.action === 'buy') {
    const amount = round2(qty * price);
    const newLot: ITaxLot = { id: 'simulated', qty, price, date: date.toISOString() };
    const afterLots = [...currentLots, newLot];
    const ltDate = longTermDate(newLot.date);

    notes.push({
      severity: 'info',
      message: `These shares become long-term on ${ltDate.format('MMM D, YYYY')}; selling them at a gain before then is taxed at your short-term rate.`,
    });
    if (cashBalance - amount < 0) {
      notes.push({
        severity: 'warning',
        message: `Not enough cash in ${account.name}: this buy needs ${usd(amount)} but the account holds ${usd(cashBalance)}.`,
      });
    }

    let washSale: WashSale | null = null;
    if (type === 'stock') {
      const windowStart = moment(date).subtract(WASH_SALE_DAYS, 'days');
      const lossSales = transactions
        .filter(
          (t) =>
            t.action === 'sell' &&
            (t.symbol ?? '').toUpperCase() === symbol &&
            (t.pnl ?? 0) < 0 &&
            moment(tradeDate(t)).isBetween(windowStart, date, 'day', '[]')
        )
        .sort((a, b) => tradeDate(b).localeCompare(tradeDate(a)));
      let replacement = qty;
      let disallowedLoss = 0;
      for (const sale of lossSales) {
        if (replacement <= 0) break;
        const matched = Math.min(replacement, sale.qty);
        disallowedLoss += (Math.abs(sale.pnl ?? 0) * matched) / sale.qty;
        replacement -= matched;
      }
      if (disallowedLoss > 0) {
        washSale = {
          triggered: true,
          disallowedLoss: round2(disallowedLoss),
          replacementQty: qty,
          message: `You sold ${symbol} at a loss in the last ${WASH_SALE_DAYS} days. Buying now makes ~${usd(disallowedLoss)} of that loss a wash sale — it isn't deductible and is added to the new shares' cost basis instead.`,
        };
      }

      const losingLots = sameSymbol.flatMap((p) => p.lots).filter((l) => l.price > price);
      const harvestable = losingLots.reduce((s, l) => s + (l.price - price) * l.qty, 0);
      if (harvestable > 0) {
        notes.push({
          severity: 'warning',
          message: `You hold ${roundQty(losingLots.reduce((s, l) => s + l.qty, 0))} ${symbol} shares below cost (~${usd(harvestable)} unrealized loss). Selling them within ${WASH_SALE_DAYS} days of this buy would be a wash sale.`,
        });
      }
    }

    return {
      ...base,
      lotMethod: null,
      amount,
      costBasis: null,
      realized: null,
      tax: null,
      netProceeds: null,
      lots: [
        {
          lotId: newLot.id,
          acquired: newLot.date,
          qty,
          costPerShare: round2(price),
          costBasis: amount,
          proceeds: 0,
          gain: 0,
          term: 'short',
          longTermDate: ltDate.format('YYYY-MM-DD'),
          estimated: false,
        },
      ],
      comparison: [],
      washSale,
      waitForLongTerm: null,
      position: {
        before: positionState(currentLots, marketPrice, date),
        after: positionState(afterLots, marketPrice, date),
      },
      portfolioWeight: { before: weight(currentLots), after: weight(afterLots) },
      cash: { before: round2(cashBalance), after: round2(cashBalance - amount) },
      notes,
    };
  }

  if (!position) throw new Error(`You don't hold ${symbol} in ${account.name}`);
  if (qty > position.holding.qty + 1e-9) {
    throw new Error(`You only hold ${position.holding.qty} ${symbol} in ${account.name}`);
  }

  const evaluate = (method: LotMethod) => {
    const selection = selectLots(currentLots, qty, method, {
      salePrice: price,
      saleDate: date,
      config,
      lotIds: input.lotIds,
    });
    const rows: SimulatedLot[] = selection.relieved.map(({ lot, qty: q }: LotSelection) => {
      const proceeds = q * price;
      const costBasis = q * lot.price;
      return {
        lotId: lot.id,
        acquired: lot.date,
        qty: q,
        costPerShare: round2(lot.price),
        costBasis: round2(costBasis),
        proceeds: round2(proceeds),
        gain: round2(proceeds - costBasis),
        term: lotTerm(lot.date, date),
        longTermDate: longTermDate(lot.date).format('YYYY-MM-DD'),
        estimated: !!lot.estimated,
      };
    });
    const sumGain = (term: Term, losses = false) =>
      rows.filter((r) => r.term === term && (!losses || r.gain < 0)).reduce((s, r) => s + r.gain, 0);
    const shortTerm = sumGain('short');
    const longTerm = sumGain('long');
    // What the tax is computed on: the realized gain minus any loss a wash sale disallows.
    let taxableShortTerm = shortTerm;
    let taxableLongTerm = longTerm;

    let washSale: WashSale | null = null;
    const lossRows = rows.filter((r) => r.gain < 0);
    if (type === 'stock' && lossRows.length) {
      const windowStart = moment(date).subtract(WASH_SALE_DAYS, 'days');
      const replacementQty = roundQty(
        [...symbolLotsElsewhere, ...selection.remaining]
          .filter((l) => !l.estimated && moment(l.date).isBetween(windowStart, date, 'day', '[]'))
          .reduce((s, l) => s + l.qty, 0)
      );
      const lossQty = lossRows.reduce((s, r) => s + r.qty, 0);
      const loss = -lossRows.reduce((s, r) => s + r.gain, 0);
      const disallowedLoss = round2(loss * Math.min(1, replacementQty / lossQty));
      const clearDate = moment(date)
        .add(WASH_SALE_DAYS + 1, 'days')
        .format('MMM D, YYYY');
      if (disallowedLoss > 0) {
        // Disallowed losses are spread back over the terms they came from.
        taxableShortTerm += (disallowedLoss * -sumGain('short', true)) / loss;
        taxableLongTerm += (disallowedLoss * -sumGain('long', true)) / loss;
      }
      washSale = {
        triggered: disallowedLoss > 0,
        disallowedLoss,
        replacementQty,
        message:
          disallowedLoss > 0
            ? `${replacementQty} ${symbol} shares bought in the ${WASH_SALE_DAYS} days before this sale make ~${usd(disallowedLoss)} of the loss a wash sale — it's added to those shares' cost basis instead of being deductible now.`
            : `To keep this loss deductible, don't buy ${symbol} again in any account before ${clearDate}.`,
      };
    }

    return {
      selection,
      rows,
      shortTerm,
      longTerm,
      washSale,
      tax: marginalTax(ytd, { shortTerm: taxableShortTerm, longTerm: taxableLongTerm }, config),
    };
  };

  const method = input.lotMethod ?? 'fifo';
  const chosen = evaluate(method);
  const comparison: MethodOutcome[] = [
    ...COMPARED_METHODS,
    ...(method === 'specific' ? ['specific' as const] : []),
  ].map((m) => {
    const outcome = m === method ? chosen : evaluate(m);
    return {
      method: m,
      shortTermGain: round2(outcome.shortTerm),
      longTermGain: round2(outcome.longTerm),
      gain: round2(outcome.shortTerm + outcome.longTerm),
      tax: outcome.tax.total,
    };
  });

  const amount = round2(qty * price);
  const costBasis = round2(chosen.rows.reduce((s, r) => s + r.costBasis, 0));
  const realizedGain = round2(chosen.rows.reduce((s, r) => s + r.gain, 0));

  const shortTermWinners = chosen.rows.filter((r) => r.term === 'short' && r.gain > 0);
  const waitSaving =
    shortTermWinners.reduce((s, r) => s + r.gain, 0) * ((config.shortTermRate - config.longTermRate) / 100);
  const waitDate = shortTermWinners
    .map((r) => r.longTermDate)
    .sort()
    .pop();
  const waitForLongTerm =
    waitDate && waitSaving > 0
      ? {
          date: waitDate,
          daysAway: moment(waitDate).diff(moment(date).startOf('day'), 'days'),
          qty: roundQty(shortTermWinners.reduce((s, r) => s + r.qty, 0)),
          taxSaving: round2(waitSaving),
        }
      : null;

  if (!chosen.selection.remaining.length) {
    notes.push({ severity: 'info', message: `This closes your ${symbol} position in ${account.name}.` });
  }
  if (chosen.rows.some((r) => r.estimated)) {
    notes.push({
      severity: 'warning',
      message:
        'Some of these lots have an estimated purchase date or cost. Edit the tax lots on the Research page for an accurate result.',
    });
  }
  const best = comparison.reduce((a, b) => (b.tax < a.tax ? b : a));
  if (best.method !== method && chosen.tax.total - best.tax >= 1) {
    notes.push({
      severity: 'success',
      message: `${METHOD_LABELS[best.method]} lot selection would cost ~${usd(chosen.tax.total - best.tax)} less in tax.`,
    });
  }
  if (chosen.tax.carryforward > 0) {
    notes.push({
      severity: 'info',
      message: `Net capital losses for ${date.year()} exceed the $3,000 annual deduction; ~${usd(chosen.tax.carryforward)} carries forward to future years.`,
    });
  }

  return {
    ...base,
    lotMethod: method,
    amount,
    costBasis,
    realized: {
      shortTerm: round2(chosen.shortTerm),
      longTerm: round2(chosen.longTerm),
      total: realizedGain,
    },
    tax: { ...chosen.tax, ytdShortTerm: round2(ytd.shortTerm), ytdLongTerm: round2(ytd.longTerm) },
    netProceeds: round2(amount - chosen.tax.total),
    lots: chosen.rows,
    comparison,
    washSale: chosen.washSale,
    waitForLongTerm,
    position: {
      before: positionState(currentLots, marketPrice, date),
      after: positionState(chosen.selection.remaining, marketPrice, date),
    },
    portfolioWeight: { before: weight(currentLots), after: weight(chosen.selection.remaining) },
    cash: { before: round2(cashBalance), after: round2(cashBalance + amount) },
    notes,
  };
};
