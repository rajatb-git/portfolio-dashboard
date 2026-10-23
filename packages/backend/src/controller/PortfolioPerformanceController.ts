import moment from 'moment';
import { ImportRunDBModel } from '../models/ImportRunModel';
import { IPortfolioSnapshotModel, PortfolioSnapshotDBModel } from '../models/PortfolioSnapshotModel';
import { TransactionModel } from '../models/TransactionModel';

export type PerformancePoint = {
  date: string;
  value: number;
  // Money moved into (buys) or out of (sells) holdings since the previous point.
  netFlow: number;
  // Time-weighted return for the day, as a fraction; null for the first point
  // or when the previous value was zero.
  dailyReturn: number | null;
  // Growth of 1 since the first point, chained from the daily returns.
  index: number;
};

// Snapshots value holdings only, so every buy raises the value and every sell
// lowers it without any gain or loss. Each day's return therefore takes out
// the day's net trade flow before comparing against the previous close; the
// chained result is the time-weighted return, which money moving in and out
// can't inflate.
export const getDailyPerformance = async (): Promise<PerformancePoint[]> => {
  const [snapshotModel, txModel, importRuns] = await Promise.all([
    PortfolioSnapshotDBModel().initialize(),
    TransactionModel().initialize(),
    ImportRunDBModel().initialize(),
  ]);

  // An import changes the portfolio's value on the day it runs, but its trades
  // are dated whenever they happened, often before any snapshot. Its trades
  // therefore aren't flows, and the import day itself has no return.
  const importDays = new Set(importRuns.getAllRecords().map((r) => moment(r.createdAt).format('YYYY-MM-DD')));

  const byDay = new Map<string, IPortfolioSnapshotModel>();
  for (const s of snapshotModel.getAllRecords()) {
    const existing = byDay.get(s.date);
    if (!existing || (s.timestamp ?? s.date) > (existing.timestamp ?? existing.date)) byDay.set(s.date, s);
  }
  const days = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));

  const flowByDay = new Map<string, number>();
  for (const t of txModel.getAllRecords()) {
    if (t.imported || (t.action !== 'buy' && t.action !== 'sell')) continue;
    const when = t.date ?? t.createdAt;
    if (!when) continue;
    const day = moment(when).format('YYYY-MM-DD');
    const amount = (t.qty ?? 0) * (t.price ?? 0) * (t.action === 'buy' ? 1 : -1);
    flowByDay.set(day, (flowByDay.get(day) ?? 0) + amount);
  }
  const sortedFlowDays = [...flowByDay.keys()].sort();

  const points: PerformancePoint[] = [];
  let index = 1;
  for (let i = 0; i < days.length; i++) {
    const { date, totalValue } = days[i];
    if (i === 0) {
      points.push({ date, value: totalValue, netFlow: 0, dailyReturn: null, index });
      continue;
    }
    const prev = days[i - 1];
    const netFlow = sortedFlowDays
      .filter((d) => d > prev.date && d <= date)
      .reduce((sum, d) => sum + (flowByDay.get(d) ?? 0), 0);
    const dailyReturn =
      prev.totalValue > 0 && !importDays.has(date) ? (totalValue - netFlow) / prev.totalValue - 1 : null;
    if (dailyReturn !== null) index *= 1 + dailyReturn;
    points.push({ date, value: totalValue, netFlow: +netFlow.toFixed(2), dailyReturn, index });
  }
  return points;
};
