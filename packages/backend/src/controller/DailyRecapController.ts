import { AccountModel } from '../models/AccountModel';
import { HoldingsModel } from '../models/HoldingsModel';
import type { IPriceStoreModel } from '../models/PriceStoreModel';
import { isViewingLiveTradingDay, mostRecentTradingDay } from '../utils/marketCalendar';
import { LiveQuoteController } from './LiveQuoteController';

// Broad-market proxies. These are ETFs, so Finnhub's free tier returns c=0 and
// LiveQuoteController transparently falls back to NASDAQ to price them.
export const MARKET_INDICES = [
  { symbol: 'SPY', label: 'S&P 500' },
  { symbol: 'QQQ', label: 'Nasdaq 100' },
  { symbol: 'DIA', label: 'Dow Jones' },
];

export type IndexMovement = { symbol: string; label: string; price: number; percentChange: number; change: number };
export type HoldingMovement = { symbol: string; name: string; percentChange: number; dayGL: number; marketValue: number };
export type AccountMovement = { account: string; dayGL: number; dayGLPercent: number; marketValue: number };

export type DailyRecap = {
  indices: IndexMovement[];
  // Per-symbol positions aggregated across accounts, with today's $ P&L (dayGL).
  holdings: HoldingMovement[];
  accounts: AccountMovement[];
  totalDayGL: number;
  totalDayGLPercent: number;
  // ET date (YYYY-MM-DD) of the trading session these figures reflect, and whether
  // that session is the current day. On a weekend/holiday marketDay is the prior
  // trading day (e.g. Friday) so the UI can say what "today" actually shows.
  marketDay: string;
  marketDayIsToday: boolean;
  generatedAt: string;
};

// Builds today's portfolio + market snapshot: index movement, per-symbol day P&L,
// and per-account day P&L. Shared by the /today page and the trading-summary worker.
// This mixes personal position data (day P&L) with public market data — callers
// decide where it goes. It never touches an AI provider.
export async function buildDailyRecap(): Promise<DailyRecap> {
  const holdingsModel = await HoldingsModel().initialize();
  const holdings = holdingsModel.getAllRecords();
  const accountModel = await AccountModel().initialize();
  const accounts = accountModel.getAllRecords();

  const quoteController = new LiveQuoteController();
  const isCrypto = new Map<string, boolean>();
  for (const h of holdings) if (!isCrypto.has(h.symbol)) isCrypto.set(h.symbol, h.type === 'crypto');
  for (const idx of MARKET_INDICES) if (!isCrypto.has(idx.symbol)) isCrypto.set(idx.symbol, false);
  const symbols = [...isCrypto.keys()];

  const quotes = await Promise.all(
    symbols.map((s) => quoteController.getLiveQuote(s, isCrypto.get(s)).catch((): null => null))
  );
  const quoteMap = new Map<string, IPriceStoreModel | null>(symbols.map((s, i) => [s, quotes[i]]));

  const indices = MARKET_INDICES.map((idx) => {
    const q = quoteMap.get(idx.symbol);
    return q
      ? {
          symbol: idx.symbol,
          label: idx.label,
          price: +q.price.toFixed(2),
          percentChange: +q.percentChange.toFixed(2),
          change: +q.change.toFixed(2),
        }
      : null;
  }).filter((x): x is IndexMovement => x !== null);

  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const byAccount = new Map<string, { account: string; dayGL: number; prevValue: number; marketValue: number }>();
  const bySymbol = new Map<
    string,
    { symbol: string; name: string; percentChange: number; dayGL: number; marketValue: number }
  >();

  for (const h of holdings) {
    const q = quoteMap.get(h.symbol);
    if (!q) continue;

    const ae = byAccount.get(h.accountId) ?? {
      account: accountName.get(h.accountId) ?? 'Unknown account',
      dayGL: 0,
      prevValue: 0,
      marketValue: 0,
    };
    ae.dayGL += h.qty * q.change;
    ae.prevValue += h.qty * q.prevClose;
    ae.marketValue += h.qty * q.price;
    byAccount.set(h.accountId, ae);

    const se = bySymbol.get(h.symbol) ?? {
      symbol: h.symbol,
      name: h.name,
      percentChange: +q.percentChange.toFixed(2),
      dayGL: 0,
      marketValue: 0,
    };
    se.dayGL += h.qty * q.change;
    se.marketValue += h.qty * q.price;
    bySymbol.set(h.symbol, se);
  }

  const accountsOut = [...byAccount.values()]
    .map((e) => ({
      account: e.account,
      dayGL: +e.dayGL.toFixed(2),
      dayGLPercent: e.prevValue > 0 ? +((e.dayGL / e.prevValue) * 100).toFixed(2) : 0,
      marketValue: +e.marketValue.toFixed(2),
    }))
    .sort((a, b) => b.marketValue - a.marketValue);

  const holdingsOut = [...bySymbol.values()].map((e) => ({
    symbol: e.symbol,
    name: e.name,
    percentChange: e.percentChange,
    dayGL: +e.dayGL.toFixed(2),
    marketValue: +e.marketValue.toFixed(2),
  }));

  const totalDayGL = +holdingsOut.reduce((s, h) => s + h.dayGL, 0).toFixed(2);
  const totalPrev = [...byAccount.values()].reduce((s, e) => s + e.prevValue, 0);
  const totalDayGLPercent = totalPrev > 0 ? +((totalDayGL / totalPrev) * 100).toFixed(2) : 0;

  return {
    indices,
    holdings: holdingsOut,
    accounts: accountsOut,
    totalDayGL,
    totalDayGLPercent,
    marketDay: mostRecentTradingDay(),
    marketDayIsToday: isViewingLiveTradingDay(),
    generatedAt: new Date().toISOString(),
  };
}
