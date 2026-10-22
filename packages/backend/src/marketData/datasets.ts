import moment from 'moment';
import {
  getCompanyNews,
  getCompanyProfile,
  getEarningsCalendar,
  getEarningsHistory,
  getInsiderTransactions,
  getMarketStatus,
  getQuoteForSymbol,
  getRecommendation,
  getStockMetrics,
  getStockPeers,
} from '../externalApis/finnHub';
import { type ExtendedQuote, getQuoteFromNasdaq, type NasdaqQuote } from '../externalApis/nasdaq';
import type { QuoteResponse } from '../externalApis/types';
import { getMarketSession, isExtendedHoursSession } from '../utils/marketCalendar';
import type { RequestOptions } from './finnhubClient';

// Every kind of public market data the app reads from Finnhub, how long a copy
// stays good, and how to fetch it. The store serves reads from these; the
// scheduler keeps the ones somebody needs inside their freshness window.
//
// Freshness tracks how fast each thing actually moves: a peer list or company
// profile is effectively static, insider filings and earnings change daily,
// news within the hour, quotes by the minute.

export type DatasetName =
  | 'quote'
  | 'recommendation'
  | 'profile'
  | 'metrics'
  | 'peers'
  | 'earningsNext'
  | 'earningsHistory'
  | 'insider'
  | 'news'
  | 'marketStatus';

export type Source = 'finnhub' | 'nasdaq';

export type StoredEntry = { value: any; fetchedAt: string };

export type FreshnessContext = {
  // Open on the Research page within the last few minutes.
  viewed: boolean;
  // How many quotes the scheduler is keeping fresh, which sets their cadence.
  quoteCount: number;
};

export type DatasetDef = {
  // Lower is refreshed first among equally overdue items.
  rank: number;
  freshForMs: (key: string, entry: StoredEntry | undefined, ctx: FreshnessContext) => number;
  source: (key: string, entry: StoredEntry | undefined) => Source;
  fetch: (key: string, options: RequestOptions, entry: StoredEntry | undefined) => Promise<any>;
};

export type Quote = {
  symbol: string;
  price: number;
  percentChange: number;
  change: number;
  dayHigh: number;
  dayLow: number;
  open: number;
  prevClose: number;
  priceDate: string;
  // Latest pre-market / after-hours print, measured against the regular-session
  // close above. Zeroed outside extended hours so a stale overnight quote is
  // never presented as live.
  extendedPrice: number;
  extendedChange: number;
  extendedPercentChange: number;
  extendedSession: string;
  extendedAt: string;
  // Set when Finnhub's free quote answered 0 (most US ETFs), so later refreshes
  // go straight to NASDAQ instead of spending a Finnhub call to learn it again.
  finnhubUnsupportedAt?: string;
  updatedAt: string;
};

// Finnhub's company-news item, as the Research and IPO pages render it.
export type NewsArticle = {
  id: number;
  category: string;
  related: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  datetime: number;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Roughly a third of the free minute goes to quotes; the rest is the user
// reserve and slower-moving data.
const QUOTES_PER_MINUTE = 20;
const VIEWED_QUOTE_FRESH_MS = 30_000;
const UNSUPPORTED_RECHECK_MS = 7 * DAY;
const NEWS_LOOKBACK_DAYS = 7;
const NEWS_KEEP = 60;

const CRYPTO_PREFIX = 'crypto:';

export const quoteKey = (symbol: string, isCrypto: boolean): string =>
  isCrypto ? `${CRYPTO_PREFIX}${symbol.toUpperCase()}` : symbol.toUpperCase();

export const parseQuoteKey = (key: string): { symbol: string; isCrypto: boolean } =>
  key.startsWith(CRYPTO_PREFIX)
    ? { symbol: key.slice(CRYPTO_PREFIX.length), isCrypto: true }
    : { symbol: key, isCrypto: false };

// The most recent 16:00 ET on a weekday, as an instant.
const lastRegularClose = (): number => {
  const etNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const close = new Date(etNow.getFullYear(), etNow.getMonth(), etNow.getDate(), 16, 0, 0, 0);
  if (close > etNow) close.setDate(close.getDate() - 1);
  while (close.getDay() === 0 || close.getDay() === 6) close.setDate(close.getDate() - 1);
  return Date.now() - (etNow.getTime() - close.getTime());
};

const quoteCadenceMs = (ctx: FreshnessContext): number =>
  Math.max(MINUTE, Math.ceil(ctx.quoteCount / QUOTES_PER_MINUTE) * MINUTE);

const finnhubUnsupported = (entry: StoredEntry | undefined): boolean => {
  const at = entry?.value?.finnhubUnsupportedAt;
  return !!at && Date.now() - new Date(at).getTime() < UNSUPPORTED_RECHECK_MS;
};

const fetchQuote = async (key: string, options: RequestOptions, entry: StoredEntry | undefined): Promise<Quote> => {
  const { symbol, isCrypto } = parseQuoteKey(key);
  let unsupportedAt = finnhubUnsupported(entry) ? entry?.value?.finnhubUnsupportedAt : undefined;

  let apiFetch: QuoteResponse | NasdaqQuote;
  if (!isCrypto && (isExtendedHoursSession() || unsupportedAt)) {
    // Finnhub's REST /quote only ever reports the regular session, so during
    // pre-/post-market source from NASDAQ, which splits the last regular close
    // from the live extended-hours print. Fall back to Finnhub if NASDAQ can't
    // price the symbol — that costs the extended figures, not the quote itself.
    try {
      apiFetch = await getQuoteFromNasdaq(symbol);
    } catch (err) {
      if (unsupportedAt) throw err;
      apiFetch = await getQuoteForSymbol(symbol, isCrypto, options);
    }
  } else {
    apiFetch = await getQuoteForSymbol(symbol, isCrypto, options);

    // Finnhub's free plan returns c=0 for symbols it doesn't cover (notably most
    // US ETFs). NASDAQ can price those; if it can't either this throws and the
    // symbol stays unpriced rather than cached at zero.
    if (!isCrypto && (!apiFetch.c || apiFetch.c <= 0)) {
      apiFetch = await getQuoteFromNasdaq(symbol);
      unsupportedAt = new Date().toISOString();
    }
  }

  if (!apiFetch.c || apiFetch.c <= 0) throw new Error(`No price available for ${symbol}`);

  const extended: ExtendedQuote | null = ('extended' in apiFetch && apiFetch.extended) || null;
  return {
    symbol,
    price: apiFetch.c,
    percentChange: apiFetch.dp,
    change: apiFetch.d,
    dayHigh: apiFetch.h,
    dayLow: apiFetch.l,
    open: apiFetch.o,
    prevClose: apiFetch.pc,
    priceDate: moment.unix(apiFetch.t).toISOString(),
    extendedPrice: extended?.price ?? 0,
    extendedChange: extended?.change ?? 0,
    extendedPercentChange: extended?.percentChange ?? 0,
    extendedSession: extended?.session ?? '',
    extendedAt: extended?.asOf ?? '',
    ...(unsupportedAt && { finnhubUnsupportedAt: unsupportedAt }),
    updatedAt: new Date().toISOString(),
  };
};

const finnhub = (): Source => 'finnhub';
const fixed = (ms: number) => (): number => ms;

export const DATASETS: Record<DatasetName, DatasetDef> = {
  quote: {
    rank: 0,
    freshForMs: (key, entry, ctx) => {
      if (parseQuoteKey(key).isCrypto || getMarketSession() !== 'closed') {
        return ctx.viewed ? VIEWED_QUOTE_FRESH_MS : quoteCadenceMs(ctx);
      }
      // Outside every session a quote taken after the last close stays right
      // until the next pre-market opens.
      if (!entry) return 0;
      return new Date(entry.fetchedAt).getTime() >= lastRegularClose() ? Number.POSITIVE_INFINITY : 0;
    },
    source: (key, entry) => {
      const { isCrypto } = parseQuoteKey(key);
      return !isCrypto && (isExtendedHoursSession() || finnhubUnsupported(entry)) ? 'nasdaq' : 'finnhub';
    },
    fetch: fetchQuote,
  },
  marketStatus: {
    rank: 1,
    freshForMs: () => (getMarketSession() === 'closed' ? 10 * MINUTE : MINUTE),
    source: finnhub,
    fetch: (key, options) => getMarketStatus(key, options),
  },
  news: {
    rank: 2,
    freshForMs: () => (getMarketSession() === 'closed' ? 2 * HOUR : 30 * MINUTE),
    source: finnhub,
    fetch: async (key, options): Promise<NewsArticle[]> => {
      const from = moment().subtract(NEWS_LOOKBACK_DAYS, 'days').format('YYYY-MM-DD');
      const to = moment().format('YYYY-MM-DD');
      const articles = await getCompanyNews(key, from, to, options);
      return [...articles]
        .sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0))
        .slice(0, NEWS_KEEP)
        .map((a) => ({
          id: a.id,
          category: a.category ?? '',
          related: a.related ?? '',
          headline: a.headline ?? '',
          summary: a.summary ?? '',
          source: a.source ?? '',
          url: a.url ?? '',
          image: a.image ?? '',
          datetime: a.datetime ?? 0,
        }));
    },
  },
  recommendation: {
    rank: 3,
    freshForMs: fixed(DAY),
    source: finnhub,
    fetch: (key, options) => getRecommendation(key, options),
  },
  earningsNext: {
    rank: 3,
    freshForMs: fixed(6 * HOUR),
    source: finnhub,
    fetch: (key, options) => getEarningsCalendar(key, options),
  },
  metrics: {
    rank: 4,
    freshForMs: fixed(12 * HOUR),
    source: finnhub,
    fetch: (key, options) => getStockMetrics(key, options),
  },
  insider: {
    rank: 4,
    freshForMs: fixed(12 * HOUR),
    source: finnhub,
    fetch: (key, options) => getInsiderTransactions(key, options),
  },
  earningsHistory: {
    rank: 4,
    freshForMs: fixed(DAY),
    source: finnhub,
    fetch: (key, options) => getEarningsHistory(key, options),
  },
  profile: {
    rank: 5,
    freshForMs: fixed(7 * DAY),
    source: finnhub,
    fetch: (key, options) => getCompanyProfile(key, options),
  },
  peers: {
    rank: 5,
    freshForMs: fixed(7 * DAY),
    source: finnhub,
    fetch: (key, options) => getStockPeers(key, options),
  },
};

// What a held (or currently viewed) stock needs for the dashboard and for the
// Research page to open from cache.
export const STOCK_DATASETS: DatasetName[] = [
  'quote',
  'recommendation',
  'profile',
  'metrics',
  'peers',
  'earningsNext',
  'earningsHistory',
  'insider',
  'news',
];
