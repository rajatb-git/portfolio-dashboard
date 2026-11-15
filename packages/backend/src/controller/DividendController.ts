import moment from 'moment';
import { getDividendsFromNasdaq, type NasdaqDividends } from '../externalApis/nasdaq';
import type { CompanyProfile2Response } from '../externalApis/types';
import { read } from '../marketData/store';
import { AccountModel } from '../models/AccountModel';
import { CacheDBModel } from '../models/CacheModel';
import { HoldingsModel } from '../models/HoldingsModel';
import { TransactionModel } from '../models/TransactionModel';
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

export type DividendPayment = {
  id: string;
  accountId: string;
  accountName: string;
  symbol: string;
  date: string;
  amount: number;
};

// Dividends actually paid, from the transaction log (imported or entered).
export type DividendsReceived = {
  total: number;
  trailing12Months: number;
  thisYear: number;
  payments: number;
  byYear: Array<{ year: number; amount: number; payments: number }>;
  bySymbol: Array<{ symbol: string; amount: number; payments: number; lastDate: string }>;
  recent: DividendPayment[];
};

export type DividendSummary = {
  received: DividendsReceived;
  holdings: HoldingDividend[];
  totalAnnualIncome: number;
  averageMonthlyIncome: number;
  // Income-weighted portfolio yield on cost.
  portfolioYieldOnCostPercent: number;
  // Payments with a known future date, soonest first.
  upcoming: Array<{ symbol: string; name: string; date: string; amount: number; event: 'ex_dividend' | 'payment' }>;
  payerCount: number;
  // Funds held without dividend data: NASDAQ publishes none for ETFs, so their
  // distributions are missing from the totals rather than zero.
  fundsNotCovered: string[];
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

const RECENT_PAYMENTS = 25;

export async function buildDividendsReceived(): Promise<DividendsReceived> {
  const [txModel, accountsModel] = await Promise.all([TransactionModel().initialize(), AccountModel().initialize()]);
  const accountNames = new Map(accountsModel.getAllRecords().map((a) => [a.id, a.name]));
  const payments: DividendPayment[] = txModel
    .getAllRecords()
    .filter((t) => t.action === 'dividend')
    .map((t) => ({
      id: t.id,
      accountId: t.accountId,
      accountName: accountNames.get(t.accountId) ?? t.accountId,
      symbol: (t.symbol ?? '').toUpperCase(),
      date: moment(t.date ?? t.createdAt).format('YYYY-MM-DD'),
      amount: +((t.qty ?? 0) * (t.price ?? 1)).toFixed(2),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const yearAgo = moment().subtract(12, 'months').format('YYYY-MM-DD');
  const year = moment().year();
  const byYear = new Map<number, { year: number; amount: number; payments: number }>();
  const bySymbol = new Map<string, { symbol: string; amount: number; payments: number; lastDate: string }>();
  let total = 0;
  let trailing = 0;
  for (const p of payments) {
    total += p.amount;
    if (p.date > yearAgo) trailing += p.amount;
    const y = Number(p.date.slice(0, 4));
    const yr = byYear.get(y) ?? { year: y, amount: 0, payments: 0 };
    yr.amount += p.amount;
    yr.payments += 1;
    byYear.set(y, yr);
    const sym = bySymbol.get(p.symbol) ?? { symbol: p.symbol, amount: 0, payments: 0, lastDate: p.date };
    sym.amount += p.amount;
    sym.payments += 1;
    bySymbol.set(p.symbol, sym);
  }
  const round = <T extends { amount: number }>(x: T): T => ({ ...x, amount: +x.amount.toFixed(2) });

  return {
    total: +total.toFixed(2),
    trailing12Months: +trailing.toFixed(2),
    thisYear: +(byYear.get(year)?.amount ?? 0).toFixed(2),
    payments: payments.length,
    byYear: [...byYear.values()].sort((a, b) => b.year - a.year).map(round),
    bySymbol: [...bySymbol.values()].sort((a, b) => b.amount - a.amount).map(round),
    recent: payments.slice(0, RECENT_PAYMENTS),
  };
}

// Personal position data (share counts, cost basis, expected income) stays on the
// server and goes only to the user's own UI and MQTT broker — never to an AI provider.
export async function buildDividendSummary(): Promise<DividendSummary> {
  const positions = await loadPositions();

  const results: HoldingDividend[] = [];
  const noData: string[] = [];
  for (let i = 0; i < positions.length; i += SYMBOL_CONCURRENCY) {
    const batch = positions.slice(i, i + SYMBOL_CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(async (position) => {
        const dividends = await fetchDividendsCached(position.symbol);
        if (!dividends) {
          noData.push(position.symbol);
          return null;
        }

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
          yieldOnCostPercent: averagePrice > 0 ? +((dividends.annualizedDividend / averagePrice) * 100).toFixed(2) : 0,
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

  // Finnhub's free plan has a company profile for every listed company but none
  // for funds, so a stored empty profile marks a fund.
  const fundsNotCovered: string[] = [];
  for (const symbol of noData) {
    const profile = await read<CompanyProfile2Response>('profile', symbol);
    if (profile.value && !profile.value.name) fundsNotCovered.push(symbol);
  }
  fundsNotCovered.sort();

  const totalAnnualIncome = +results.reduce((sum, h) => sum + h.annualIncome, 0).toFixed(2);
  const totalCost = results.reduce((sum, h) => sum + h.qty * h.averagePrice, 0);

  const today = moment().startOf('day');
  const upcoming = results
    .flatMap((h) => [
      {
        symbol: h.symbol,
        name: h.name,
        date: h.nextExDate,
        amount: h.nextPaymentAmount,
        event: 'ex_dividend' as const,
      },
      { symbol: h.symbol, name: h.name, date: h.nextPayDate, amount: h.nextPaymentAmount, event: 'payment' as const },
    ])
    .filter((e) => e.date && !moment(e.date).isBefore(today))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    received: await buildDividendsReceived(),
    holdings: results,
    totalAnnualIncome,
    averageMonthlyIncome: +(totalAnnualIncome / 12).toFixed(2),
    portfolioYieldOnCostPercent: totalCost > 0 ? +((totalAnnualIncome / totalCost) * 100).toFixed(2) : 0,
    upcoming,
    payerCount: results.length,
    fundsNotCovered,
    generatedAt: new Date().toISOString(),
  };
}
