import moment from 'moment';
import { TransactionModel } from '../models/TransactionModel';
import { lotTerm, tradeDate } from './TaxLotController';

export type RealizedLot = {
  symbol: string;
  acquiredDate: string;
  soldDate: string;
  qty: number;
  proceeds: number;
  costBasis: number;
  gain: number;
  term: 'short' | 'long';
  year: number;
};

export type YearSummary = {
  year: number;
  proceeds: number;
  costBasis: number;
  gain: number;
  shortTermGain: number;
  longTermGain: number;
  count: number;
};

export type RealizedGainsResult = {
  lots: RealizedLot[];
  byYear: YearSummary[];
  totals: Omit<YearSummary, 'year'>;
  unmatchedSells: number; // sells without enough recorded buy history to compute cost basis
};

const round = (n: number) => +n.toFixed(2);

type OpenLot = { id: string; qty: number; price: number; date: string };

export const calculateRealizedGains = async (): Promise<RealizedGainsResult> => {
  const model = await TransactionModel().initialize();
  const all = model.getAllRecords();

  const trades = all
    .filter(
      (t) => (t.type === 'stock' || t.type === 'crypto') && (t.action === 'buy' || t.action === 'sell') && t.symbol
    )
    .sort((a, b) => tradeDate(a).localeCompare(tradeDate(b)));

  // Open-lot queue per symbol. Sells that recorded which lots they relieved are
  // matched to those lots; older sells fall back to FIFO.
  const lotsBySymbol: Record<string, OpenLot[]> = {};
  const realized: RealizedLot[] = [];
  let unmatchedSells = 0;

  for (const t of trades) {
    const symbol = (t.symbol as string).toUpperCase();
    const queue = (lotsBySymbol[symbol] ??= []);
    const price = t.price ?? 0;

    if (t.action === 'buy') {
      queue.push({ id: t.lotId || t.id, qty: t.qty, price, date: tradeDate(t) });
      continue;
    }

    const soldDate = tradeDate(t);
    const record = (qty: number, costPrice: number, acquiredDate: string) => {
      const proceeds = qty * price;
      const costBasis = qty * costPrice;
      realized.push({
        symbol,
        acquiredDate,
        soldDate,
        qty: round(qty),
        proceeds: round(proceeds),
        costBasis: round(costBasis),
        gain: round(proceeds - costBasis),
        term: lotTerm(acquiredDate, soldDate),
        year: moment(soldDate).year(),
      });
    };
    const takeFromQueue = (qty: number, lotId?: string): Array<{ qty: number; lot: OpenLot }> => {
      const taken: Array<{ qty: number; lot: OpenLot }> = [];
      let remaining = qty;
      const named = lotId ? queue.find((l) => l.id === lotId) : undefined;
      for (const lot of named ? [named, ...queue.filter((l) => l !== named)] : [...queue]) {
        if (remaining <= 1e-9) break;
        const matched = Math.min(remaining, lot.qty);
        if (matched <= 0) continue;
        taken.push({ qty: matched, lot });
        lot.qty -= matched;
        remaining -= matched;
      }
      queue.splice(0, queue.length, ...queue.filter((l) => l.qty > 1e-9));
      return taken;
    };

    if (t.lots?.length) {
      for (const relieved of t.lots) {
        takeFromQueue(relieved.qty, relieved.lotId);
        record(relieved.qty, relieved.price, relieved.date);
      }
      continue;
    }

    const taken = takeFromQueue(t.qty);
    for (const { qty, lot } of taken) record(qty, lot.price, lot.date);
    const matchedQty = taken.reduce((sum, x) => sum + x.qty, 0);
    if (t.qty - matchedQty > 1e-9) unmatchedSells += 1;
  }

  const byYearMap: Record<number, YearSummary> = {};
  const totals: Omit<YearSummary, 'year'> = {
    proceeds: 0,
    costBasis: 0,
    gain: 0,
    shortTermGain: 0,
    longTermGain: 0,
    count: 0,
  };

  for (const lot of realized) {
    const ys = (byYearMap[lot.year] ??= {
      year: lot.year,
      proceeds: 0,
      costBasis: 0,
      gain: 0,
      shortTermGain: 0,
      longTermGain: 0,
      count: 0,
    });
    ys.proceeds += lot.proceeds;
    ys.costBasis += lot.costBasis;
    ys.gain += lot.gain;
    ys.count += 1;
    if (lot.term === 'long') ys.longTermGain += lot.gain;
    else ys.shortTermGain += lot.gain;

    totals.proceeds += lot.proceeds;
    totals.costBasis += lot.costBasis;
    totals.gain += lot.gain;
    totals.count += 1;
    if (lot.term === 'long') totals.longTermGain += lot.gain;
    else totals.shortTermGain += lot.gain;
  }

  const byYear = Object.values(byYearMap)
    .map((y) => ({
      ...y,
      proceeds: round(y.proceeds),
      costBasis: round(y.costBasis),
      gain: round(y.gain),
      shortTermGain: round(y.shortTermGain),
      longTermGain: round(y.longTermGain),
    }))
    .sort((a, b) => b.year - a.year);

  return {
    lots: realized.sort((a, b) => b.soldDate.localeCompare(a.soldDate)),
    byYear,
    totals: {
      proceeds: round(totals.proceeds),
      costBasis: round(totals.costBasis),
      gain: round(totals.gain),
      shortTermGain: round(totals.shortTermGain),
      longTermGain: round(totals.longTermGain),
      count: totals.count,
    },
    unmatchedSells,
  };
};
