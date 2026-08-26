import { AccountModel } from '../models/AccountModel';
import { HoldingsModel } from '../models/HoldingsModel';
import type { IPriceStoreModel } from '../models/PriceStoreModel';
import {
  getMarketSession,
  getNextSessionChange,
  isViewingLiveTradingDay,
  type MarketSession,
  mostRecentTradingDay,
} from '../utils/marketCalendar';
import { LiveQuoteController } from './LiveQuoteController';

// Broad-market proxies. These are ETFs, so Finnhub's free tier returns c=0 and
// LiveQuoteController transparently falls back to NASDAQ to price them.
export const MARKET_INDICES = [
  { symbol: 'SPY', label: 'S&P 500' },
  { symbol: 'QQQ', label: 'Nasdaq 100' },
  { symbol: 'DIA', label: 'Dow Jones' },
];

export type IndexMovement = { symbol: string; label: string; price: number; percentChange: number; change: number };
export type HoldingMovement = {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto';
  percentChange: number;
  dayGL: number;
  marketValue: number;
};
export type AccountMovement = { account: string; dayGL: number; dayGLPercent: number; marketValue: number };

// One symbol's pre-market / after-hours move, measured from the regular-session
// close, plus what that move is worth across the accounts holding it.
export type ExtendedMovement = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  percentChange: number;
  gl: number;
  asOf: string;
};

export type ExtendedRecap = {
  session: Exclude<MarketSession, 'regular' | 'closed'>;
  indices: ExtendedMovement[];
  holdings: ExtendedMovement[];
  totalGL: number;
  totalGLPercent: number;
  asOf: string;
};

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
  // Which US-equity session is running right now, and when it next changes, so the
  // UI can say "pre-market, opens in 1h 39m" instead of a flat "markets are closed".
  session: MarketSession;
  nextSessionChange: { session: MarketSession; at: string };
  // Present only during pre-/post-market, and only when extended-hours prices are
  // actually available for something the user holds or tracks.
  extended: ExtendedRecap | null;
  generatedAt: string;
};

// Aggregates the extended-hours prints already stored on each quote into a
// session view: what the indices are doing before the bell, which holdings are
// moving, and what those moves are worth. Returns null outside pre-/post-market,
// or when no tracked symbol has an extended-hours price — a quiet overnight tape
// is normal and should surface as "nothing trading yet", not an empty card.
function buildExtendedRecap(
  session: MarketSession,
  quoteMap: Map<string, IPriceStoreModel | null>,
  holdings: Array<{ symbol: string; name: string; qty: number; type: 'stock' | 'crypto' }>,
  bySymbol: Map<string, HoldingMovement>
): ExtendedRecap | null {
  if (session !== 'pre-market' && session !== 'post-market') return null;

  // A quote only counts as extended-hours data if it was captured in the session
  // running right now — never a leftover print from the previous evening.
  const extendedQuote = (symbol: string): IPriceStoreModel | null => {
    const q = quoteMap.get(symbol);
    if (!q || q.extendedSession !== session) return null;
    return q.extendedPrice > 0 ? q : null;
  };

  const indices = MARKET_INDICES.map((idx) => {
    const q = extendedQuote(idx.symbol);
    return q
      ? {
          symbol: idx.symbol,
          name: idx.label,
          price: +q.extendedPrice.toFixed(2),
          change: +q.extendedChange.toFixed(2),
          percentChange: +q.extendedPercentChange.toFixed(2),
          gl: 0,
          asOf: q.extendedAt,
        }
      : null;
  }).filter((x): x is ExtendedMovement => x !== null);

  const qtyBySymbol = new Map<string, number>();
  for (const h of holdings) {
    if (h.type === 'crypto') continue;
    qtyBySymbol.set(h.symbol, (qtyBySymbol.get(h.symbol) ?? 0) + h.qty);
  }

  let totalGL = 0;
  let closeValue = 0;
  const holdingMoves: ExtendedMovement[] = [];

  for (const [symbol, qty] of qtyBySymbol) {
    const q = extendedQuote(symbol);
    if (!q) continue;

    const gl = qty * q.extendedChange;
    totalGL += gl;
    closeValue += qty * q.price;
    holdingMoves.push({
      symbol,
      name: bySymbol.get(symbol)?.name ?? symbol,
      price: +q.extendedPrice.toFixed(2),
      change: +q.extendedChange.toFixed(2),
      percentChange: +q.extendedPercentChange.toFixed(2),
      gl: +gl.toFixed(2),
      asOf: q.extendedAt,
    });
  }

  if (indices.length === 0 && holdingMoves.length === 0) return null;

  holdingMoves.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));
  const asOf = [...indices, ...holdingMoves].map((m) => m.asOf).filter(Boolean).sort().pop() ?? '';

  return {
    session,
    indices,
    holdings: holdingMoves,
    totalGL: +totalGL.toFixed(2),
    totalGLPercent: closeValue > 0 ? +((totalGL / closeValue) * 100).toFixed(2) : 0,
    asOf,
  };
}

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
  const bySymbol = new Map<string, HoldingMovement>();

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
      type: h.type,
      percentChange: +q.percentChange.toFixed(2),
      dayGL: 0,
      marketValue: 0,
    };
    se.dayGL += h.qty * q.change;
    se.marketValue += h.qty * q.price;
    bySymbol.set(h.symbol, se);
  }

  const session = getMarketSession();
  const extended = buildExtendedRecap(session, quoteMap, holdings, bySymbol);

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
    type: e.type,
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
    session,
    nextSessionChange: getNextSessionChange(),
    extended,
    generatedAt: new Date().toISOString(),
  };
}
