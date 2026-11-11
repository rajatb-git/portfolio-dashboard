import { getDailyPerformance } from './PortfolioPerformanceController';

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

// Chain each month's daily time-weighted returns, so a month with buys or
// sells reports what the holdings earned, not how much money moved.
export const calculateMonthlyReturns = async (): Promise<MonthlyReturnsResult> => {
  const points = await getDailyPerformance();

  const empty: MonthlyReturnsResult = {
    months: [],
    yearlyReturns: [],
    bestMonth: null,
    worstMonth: null,
    firstYear: null,
    lastYear: null,
  };
  if (points.length < 2) return empty;

  // The first month starts from its first close, so it is a partial month.
  const growthByMonth = new Map<string, number | null>();
  for (const p of points) {
    const key = p.date.slice(0, 7);
    const growth = growthByMonth.get(key) ?? null;
    if (p.dailyReturn === null) {
      growthByMonth.set(key, growth);
      continue;
    }
    growthByMonth.set(key, (growth ?? 1) * (1 + p.dailyReturn));
  }

  const sortedKeys = [...growthByMonth.keys()].sort();
  const months: MonthlyReturn[] = sortedKeys.map((key) => {
    const [y, m] = key.split('-').map(Number);
    const growth = growthByMonth.get(key) ?? null;
    return { year: y, month: m, return: growth === null ? null : +((growth - 1) * 100).toFixed(2) };
  });

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
