import moment from 'moment';
import { getDividendsFromNasdaq, type NasdaqDividends } from '../externalApis/nasdaq';
import { CacheDBModel } from '../models/CacheModel';
import { HoldingsModel } from '../models/HoldingsModel';
import { logger } from '../utils/winston';

const LABEL = 'DividendController';

// Dividend rates and calendars change a few times a year, so a long cache keeps
// this off NASDAQ's back while staying fresh enough to catch a declaration.
const CACHE_HOURS = 12;
const SYMBOL_CONCURRENCY = 4;

export type HoldingDividend = {
  symbol: string;
  name: string;
  qty: number;
  // Weighted average cost across every account holding the symbol.
  averagePrice: number;
  amountPerShare: number;
  annualizedDividend: number;
  // Current market yield, as published.
  yieldPercent: number;
  // Annual rate measured against what the position actually cost.
  yieldOnCostPercent: number;
  annualIncome: number;
  nextExDate: string;
  nextPayDate: string;
  nextPaymentAmount: number;
};

export type DividendSummary = {
  holdings: HoldingDividend[];
  totalAnnualIncome: number;
  averageMonthlyIncome: number;
  // Income-weighted portfolio yield on cost.
  portfolioYieldOnCostPercent: number;
  // Payments with a known future date, soonest first.
  upcoming: Array<{ symbol: string; name: string; date: string; amount: number; event: 'ex_dividend' | 'payment' }>;
  payerCount: number;
  generatedAt: string;
};

type Position = { symbol: string; name: string; qty: number; cost: number };

const cacheKey = (symbol: string): string => `dividends_${symbol.toUpperCase()}`;

async function fetchDividendsCached(symbol: string): Promise<NasdaqDividends | null> {
  const cacheModel = await CacheDBModel().initialize();
  const key = cacheKey(symbol);
  const cached = cacheModel.findById(key);

  if (cached && moment().diff(moment(cached.updatedAt), 'hours') < CACHE_HOURS) {
    try {
      // A cached non-payer is stored as 'null' so we don't re-ask every cycle.
      return JSON.parse(cached.value);
    } catch {
      // stale/corrupt cache, refetch
    }
  }

  const dividends = await getDividendsFromNasdaq(symbol);
  try {
    await cacheModel.insertOrUpdate({ key, value: JSON.stringify(dividends) }, key);
  } catch (err: any) {
    logger.log({ level: 'error', label: LABEL, message: `Failed to cache ${symbol}: ${err.message}` });
  }
  return dividends;
}

// Aggregate positions across accounts: total shares and a weighted average cost.
async function loadPositions(): Promise<Position[]> {
  const holdingsModel = await HoldingsModel().initialize();
  const bySymbol = new Map<string, Position>();

  for (const holding of holdingsModel.getAllRecords()) {
    if (holding.type !== 'stock' || !holding.symbol || holding.qty <= 0) continue;
    const symbol = holding.symbol.toUpperCase();
    const existing = bySymbol.get(symbol) ?? { symbol, name: holding.name, qty: 0, cost: 0 };
    existing.qty += holding.qty;
    existing.cost += holding.qty * holding.averagePrice;
    bySymbol.set(symbol, existing);
  }

  return [...bySymbol.values()];
}

// The per-payment rate currently in force — the newest history row, falling back
// to a quarter of the annual rate when NASDAQ lists a rate but no history.
function currentRate(dividends: NasdaqDividends): number {
  const newest = [...dividends.history].sort((a, b) => b.exOrEffDate.localeCompare(a.exOrEffDate))[0];
  if (newest?.amount) return newest.amount;
  return dividends.annualizedDividend > 0 ? +(dividends.annualizedDividend / 4).toFixed(4) : 0;
}

// Personal position data (share counts, cost basis, expected income) stays on the
// server and goes only to the user's own UI and MQTT broker — never to an AI provider.
export async function buildDividendSummary(): Promise<DividendSummary> {
  const positions = await loadPositions();

  const results: HoldingDividend[] = [];
  for (let i = 0; i < positions.length; i += SYMBOL_CONCURRENCY) {
    const batch = positions.slice(i, i + SYMBOL_CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(async (position) => {
        const dividends = await fetchDividendsCached(position.symbol);
        if (!dividends) return null;

        const amountPerShare = currentRate(dividends);
        const averagePrice = position.qty > 0 ? position.cost / position.qty : 0;
        const annualIncome = position.qty * dividends.annualizedDividend;

        return {
          symbol: position.symbol,
          name: position.name,
          qty: position.qty,
          averagePrice: +averagePrice.toFixed(4),
          amountPerShare,
          annualizedDividend: dividends.annualizedDividend,
          yieldPercent: dividends.yieldPercent,
          yieldOnCostPercent:
            averagePrice > 0 ? +((dividends.annualizedDividend / averagePrice) * 100).toFixed(2) : 0,
          annualIncome: +annualIncome.toFixed(2),
          nextExDate: dividends.exDividendDate,
          nextPayDate: dividends.dividendPaymentDate,
          nextPaymentAmount: +(position.qty * amountPerShare).toFixed(2),
        } satisfies HoldingDividend;
      })
    );

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled' && outcome.value) results.push(outcome.value);
      else if (outcome.status === 'rejected') {
        logger.log({ level: 'error', label: LABEL, message: `Dividend lookup failed: ${outcome.reason}` });
      }
    }
  }

  results.sort((a, b) => b.annualIncome - a.annualIncome);

  const totalAnnualIncome = +results.reduce((sum, h) => sum + h.annualIncome, 0).toFixed(2);
  const totalCost = results.reduce((sum, h) => sum + h.qty * h.averagePrice, 0);

  const today = moment().startOf('day');
  const upcoming = results
    .flatMap((h) => [
      { symbol: h.symbol, name: h.name, date: h.nextExDate, amount: h.nextPaymentAmount, event: 'ex_dividend' as const },
      { symbol: h.symbol, name: h.name, date: h.nextPayDate, amount: h.nextPaymentAmount, event: 'payment' as const },
    ])
    .filter((e) => e.date && !moment(e.date).isBefore(today))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    holdings: results,
    totalAnnualIncome,
    averageMonthlyIncome: +(totalAnnualIncome / 12).toFixed(2),
    portfolioYieldOnCostPercent: totalCost > 0 ? +((totalAnnualIncome / totalCost) * 100).toFixed(2) : 0,
    upcoming,
    payerCount: results.length,
    generatedAt: new Date().toISOString(),
  };
}
