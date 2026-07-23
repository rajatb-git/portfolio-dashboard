import moment from 'moment';
import { IPortfolioSnapshotModel, PortfolioSnapshotDBModel } from '../models/PortfolioSnapshotModel';

export type MonthlyReturn = {
  year: number;
  month: number; // 1-12
  return: number | null; // percent; null when the month has no comparable data
};

export type MonthlyReturnsResult = {
  months: MonthlyReturn[];
  yearlyReturns: Array<{ year: number; return: number }>;
  bestMonth: { year: number; month: number; return: number } | null;
  worstMonth: { year: number; month: number; return: number } | null;
  firstYear: number | null;
  lastYear: number | null;
};

// Collapse intraday snapshots to the last recorded value of each calendar month,
// then chain month-end values into month-over-month percentage returns.
export const calculateMonthlyReturns = async (): Promise<MonthlyReturnsResult> => {
  const snapshotModel = await PortfolioSnapshotDBModel().initialize();
  const all = snapshotModel.getAllRecords();

  const empty: MonthlyReturnsResult = {
    months: [],
    yearlyReturns: [],
    bestMonth: null,
    worstMonth: null,
    firstYear: null,
    lastYear: null,
  };
  if (all.length < 2) return empty;

  // Last snapshot of each calendar month (keyed YYYY-MM).
  const monthEnd = new Map<string, IPortfolioSnapshotModel>();
  for (const s of all) {
    const key = s.date.slice(0, 7);
    const existing = monthEnd.get(key);
    if (!existing || (s.timestamp ?? s.date) > (existing.timestamp ?? existing.date)) {
      monthEnd.set(key, s);
    }
  }

  const sortedKeys = [...monthEnd.keys()].sort();
  if (sortedKeys.length < 2) return empty;

  const months: MonthlyReturn[] = [];
  for (let i = 1; i < sortedKeys.length; i++) {
    const prev = monthEnd.get(sortedKeys[i - 1])!.totalValue;
    const curr = monthEnd.get(sortedKeys[i])!.totalValue;
    const [y, m] = sortedKeys[i].split('-').map(Number);
    months.push({ year: y, month: m, return: prev > 0 ? +(((curr - prev) / prev) * 100).toFixed(2) : null });
  }

  // Yearly return chains every month within the year (compounded).
  const byYear = new Map<number, number>();
  for (const mr of months) {
    if (mr.return === null) continue;
    const factor = 1 + mr.return / 100;
    byYear.set(mr.year, (byYear.get(mr.year) ?? 1) * factor);
  }
  const yearlyReturns = [...byYear.entries()]
    .map(([year, factor]) => ({ year, return: +((factor - 1) * 100).toFixed(2) }))
    .sort((a, b) => a.year - b.year);

  const valued = months.filter((m): m is MonthlyReturn & { return: number } => m.return !== null);
  const bestMonth = valued.length ? valued.reduce((best, m) => (m.return > best.return ? m : best)) : null;
  const worstMonth = valued.length ? valued.reduce((worst, m) => (m.return < worst.return ? m : worst)) : null;

  const years = sortedKeys.map((k) => Number(k.slice(0, 4)));

  return {
    months,
    yearlyReturns,
    bestMonth: bestMonth && { year: bestMonth.year, month: bestMonth.month, return: bestMonth.return },
    worstMonth: worstMonth && { year: worstMonth.year, month: worstMonth.month, return: worstMonth.return },
    firstYear: Math.min(...years),
    lastYear: Math.max(...years),
  };
};
