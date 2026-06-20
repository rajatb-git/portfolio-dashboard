import moment from 'moment';
import { ITransactionModel, TransactionModel } from '../models/TransactionModel';

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

// Effective trade date: imported rows carry `date`; otherwise fall back to the insert timestamp.
const effectiveDate = (t: ITransactionModel): string => t.date || t.createdAt || moment().toISOString();

type OpenLot = { qty: number; price: number; date: string };

export const calculateRealizedGains = async (): Promise<RealizedGainsResult> => {
  const model = await TransactionModel().initialize();
  const all = model.getAllRecords();

  const trades = all
    .filter(
      (t) => (t.type === 'stock' || t.type === 'crypto') && (t.action === 'buy' || t.action === 'sell') && t.symbol
    )
    .sort((a, b) => effectiveDate(a).localeCompare(effectiveDate(b)));

  // FIFO open-lot queue per symbol.
  const lotsBySymbol: Record<string, OpenLot[]> = {};
  const realized: RealizedLot[] = [];
  let unmatchedSells = 0;

  for (const t of trades) {
    const symbol = (t.symbol as string).toUpperCase();
    const queue = (lotsBySymbol[symbol] ??= []);
    const price = t.price ?? 0;

    if (t.action === 'buy') {
      queue.push({ qty: t.qty, price, date: effectiveDate(t) });
      continue;
    }

    // sell — match against the front of the queue
    let remaining = t.qty;
    const soldDate = effectiveDate(t);
    while (remaining > 0 && queue.length > 0) {
      const lot = queue[0];
      const matched = Math.min(remaining, lot.qty);
      const proceeds = matched * price;
      const costBasis = matched * lot.price;
      const days = moment(soldDate).diff(moment(lot.date), 'days');
      realized.push({
        symbol,
        acquiredDate: lot.date,
        soldDate,
        qty: round(matched),
        proceeds: round(proceeds),
        costBasis: round(costBasis),
        gain: round(proceeds - costBasis),
        term: days > 365 ? 'long' : 'short',
        year: moment(soldDate).year(),
      });
      lot.qty -= matched;
      remaining -= matched;
      if (lot.qty <= 1e-9) queue.shift();
    }
    if (remaining > 1e-9) unmatchedSells += 1;
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
