import moment from 'moment';
import { getPriceHistoryAreaChart } from '../externalApis/nasdaq';
import { logger } from '../utils/winston';
import { createDashboard } from './DashboardController';

export type CorrelationResult = {
  symbols: string[];
  matrix: number[][]; // matrix[i][j] = Pearson correlation of daily returns, diagonal = 1
  avgCorrelation: number; // mean of the off-diagonal pairs
  diversificationScore: number; // 0 (all move together) – 100 (well diversified)
  mostCorrelated: { a: string; b: string; value: number } | null;
  leastCorrelated: { a: string; b: string; value: number } | null;
  skipped: string[]; // holdings without enough price history to include
};

// Fetching history fans out one NASDAQ request per symbol, so cap the universe to
// the largest positions — that is where concentration risk actually lives, and it
// keeps the matrix small enough to read.
const MAX_SYMBOLS = 12;
const HISTORY_RANGE = '6M';
const MIN_OVERLAP = 20; // paired trading days needed for a meaningful correlation

const dailyReturns = (series: Array<[number, number]>): Map<string, number> => {
  const sorted = [...series].sort((a, b) => a[0] - b[0]);
  const returns = new Map<string, number>();
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1][1];
    const curr = sorted[i][1];
    if (prev > 0) returns.set(moment(sorted[i][0]).format('YYYY-MM-DD'), (curr - prev) / prev);
  }
  return returns;
};

const pearson = (a: number[], b: number[]): number => {
  const n = a.length;
  if (n < 2) return 0;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }
  const denom = Math.sqrt(varA * varB);
  return denom > 0 ? cov / denom : 0;
};

export const calculateCorrelation = async (): Promise<CorrelationResult> => {
  const holdings = await createDashboard();

  // Aggregate market value per symbol (a symbol can span multiple accounts) and
  // take the largest positions.
  const valueBySymbol = new Map<string, number>();
  for (const h of holdings) {
    valueBySymbol.set(h.symbol, (valueBySymbol.get(h.symbol) ?? 0) + h.marketValue);
  }
  const topSymbols = [...valueBySymbol.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_SYMBOLS)
    .map(([symbol]) => symbol);

  const returnsBySymbol = new Map<string, Map<string, number>>();
  const skipped: string[] = [];

  await Promise.all(
    topSymbols.map(async (symbol) => {
      try {
        const history = (await getPriceHistoryAreaChart(symbol, HISTORY_RANGE)) as Array<[number, number]>;
        const returns = dailyReturns(history);
        if (returns.size >= MIN_OVERLAP) returnsBySymbol.set(symbol, returns);
        else skipped.push(symbol);
      } catch (err: any) {
        logger.log({ level: 'warn', label: 'Correlation', message: `No history for ${symbol}: ${err.message}` });
        skipped.push(symbol);
      }
    })
  );

  const symbols = topSymbols.filter((s) => returnsBySymbol.has(s));
  const matrix: number[][] = symbols.map(() => symbols.map(() => 0));

  let pairSum = 0;
  let pairCount = 0;
  let mostCorrelated: { a: string; b: string; value: number } | null = null;
  let leastCorrelated: { a: string; b: string; value: number } | null = null;

  for (let i = 0; i < symbols.length; i++) {
    matrix[i][i] = 1;
    const ri = returnsBySymbol.get(symbols[i])!;
    for (let j = i + 1; j < symbols.length; j++) {
      const rj = returnsBySymbol.get(symbols[j])!;
      const a: number[] = [];
      const b: number[] = [];
      for (const [date, val] of ri) {
        const other = rj.get(date);
        if (other !== undefined) {
          a.push(val);
          b.push(other);
        }
      }
      const corr = a.length >= MIN_OVERLAP ? +pearson(a, b).toFixed(2) : 0;
      matrix[i][j] = corr;
      matrix[j][i] = corr;
      pairSum += corr;
      pairCount += 1;
      if (!mostCorrelated || corr > mostCorrelated.value) {
        mostCorrelated = { a: symbols[i], b: symbols[j], value: corr };
      }
      if (!leastCorrelated || corr < leastCorrelated.value) {
        leastCorrelated = { a: symbols[i], b: symbols[j], value: corr };
      }
    }
  }

  const avgCorrelation = pairCount > 0 ? +(pairSum / pairCount).toFixed(2) : 0;
  // Map mean correlation [-1, 1] onto a 0–100 score (1 → 0, -1 → 100).
  const diversificationScore = Math.round(((1 - avgCorrelation) / 2) * 100);

  return {
    symbols,
    matrix,
    avgCorrelation,
    diversificationScore,
    mostCorrelated,
    leastCorrelated,
    skipped,
  };
};
