import axios from 'axios';
import moment from 'moment';
import { FinnhubBusyError, finnhubGet, type RequestOptions } from '../marketData/finnhubClient';
import { etDateAndMinutes } from '../utils/marketCalendar';
import { logger } from '../utils/winston';
import { CompanyProfile2Response, MarketNewsResponse, QuoteResponse, UpcomingIPOsResponse } from './types';

// One function per Finnhub endpoint: build the path, map the response. Budget,
// lanes, deadlines and 429 handling all live in marketData/finnhubClient.

export interface IRecommendation {
  buy: number;
  hold: number;
  period: string;
  sell: number;
  strongBuy: number;
  strongSell: number;
}

export type StockMetrics = {
  week52High: number | null;
  week52Low: number | null;
  week52HighDate: string | null;
  week52LowDate: string | null;
  beta: number | null;
  peRatio: number | null;
  priceToBook: number | null;
  roeTTM: number | null;
  revenueGrowthTTMYoy: number | null;
  avgVolume10Day: number | null;
  shortInterest: number | null;
  shortRatio: number | null;
};

const call = async <T>(label: string, path: string, options: RequestOptions | undefined): Promise<T> => {
  try {
    return await finnhubGet<T>(path, options);
  } catch (error: any) {
    // Running out of budget is expected and handled by the caller; only real
    // failures are worth an error line.
    if (!(error instanceof FinnhubBusyError)) {
      const status = axios.isAxiosError(error) ? (error.response?.status ?? 'n/a') : 'n/a';
      logger.log({ level: 'error', label, message: `${error.message} (status ${status})` });
    }
    throw error;
  }
};

const finnhubQuoteSymbol = (symbol: string, isCrypto: boolean): string =>
  isCrypto ? `COINBASE:${symbol}-USDT` : symbol;

export const getQuoteForSymbol = (symbol: string, isCrypto = false, options?: RequestOptions): Promise<QuoteResponse> =>
  call<QuoteResponse>(
    `Quote request "${symbol}"`,
    `/quote?symbol=${encodeURIComponent(finnhubQuoteSymbol(symbol, isCrypto))}`,
    options
  );

/**
 * @param  {string} symbol - stock ticker
 * @param  {string} fromDate - YYYY-MM-DD
 * @param  {string} toDate - YYYY-MM-DD
 */
export const getCompanyNews = (
  symbol: string,
  fromDate: string,
  toDate: string,
  options?: RequestOptions
): Promise<MarketNewsResponse> =>
  call<MarketNewsResponse>(
    `Company news request "${symbol}"`,
    `/company-news?symbol=${encodeURIComponent(symbol)}&from=${fromDate}&to=${toDate}`,
    options
  ).then((data) => data ?? []);

// Finnhub returns one row per month, newest first; an empty array means no
// coverage (index funds, most ETFs).
export const getRecommendation = (symbol: string, options?: RequestOptions): Promise<IRecommendation | null> =>
  call<any[]>(
    `Recommendation request "${symbol}"`,
    `/stock/recommendation?symbol=${encodeURIComponent(symbol)}`,
    options
  ).then((data) => {
    const latest = data?.[0];
    if (!latest) return null;
    return {
      buy: latest.buy,
      hold: latest.hold,
      period: latest.period,
      sell: latest.sell,
      strongBuy: latest.strongBuy,
      strongSell: latest.strongSell,
    };
  });

export const getUpcomingIPOs = (options?: RequestOptions): Promise<UpcomingIPOsResponse> => {
  const fromDate = moment().subtract(2, 'M').format('YYYY-MM-DD');
  const toDate = moment().add(2, 'M').format('YYYY-MM-DD');
  return call<UpcomingIPOsResponse>('IPO calendar request', `/calendar/ipo?from=${fromDate}&to=${toDate}`, options);
};

export const getStockMetrics = (symbol: string, options?: RequestOptions): Promise<StockMetrics> =>
  call<any>(
    `Stock metrics request "${symbol}"`,
    `/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all`,
    options
  ).then((data) => {
    const m = data?.metric ?? {};
    return {
      week52High: m['52WeekHigh'] ?? null,
      week52Low: m['52WeekLow'] ?? null,
      week52HighDate: m['52WeekHighDate'] ?? null,
      week52LowDate: m['52WeekLowDate'] ?? null,
      beta: m['beta'] ?? null,
      peRatio: m['peBasicExclExtraTTM'] ?? null,
      priceToBook: m['pbAnnual'] ?? null,
      roeTTM: m['roeTTM'] ?? null,
      revenueGrowthTTMYoy: m['revenueGrowthTTMYoy'] ?? null,
      avgVolume10Day: m['10DayAverageTradingVolume'] ?? null,
      shortInterest: m['shortInterest'] ?? null,
      shortRatio: m['shortRatio'] ?? null,
    };
  });

export const getStockPeers = (symbol: string, options?: RequestOptions): Promise<string[]> =>
  call<string[]>(`Stock peers request "${symbol}"`, `/stock/peers?symbol=${encodeURIComponent(symbol)}`, options).then(
    (data) => data ?? []
  );

export type SymbolSearchResult = {
  symbol: string;
  description: string;
  type: string;
};

// Finnhub Symbol Lookup: resolves a company name or partial ticker to matching
// symbols. Results span every exchange and instrument type, so keep only
// US-listed symbols (foreign listings carry a `.XX` exchange suffix) and cap the
// list so the search palette stays scannable.
export const searchSymbols = (query: string, options?: RequestOptions): Promise<SymbolSearchResult[]> =>
  call<any>(`Symbol search "${query}"`, `/search?q=${encodeURIComponent(query)}`, options).then((data) => {
    const results = (data?.result ?? []) as Array<{ symbol: string; description: string; type: string }>;
    return results
      .filter((r) => r.symbol && !r.symbol.includes('.') && r.description)
      .slice(0, 8)
      .map((r) => ({ symbol: r.symbol, description: r.description, type: r.type }));
  });

// Finnhub does not document the order of earningsCalendar, so the first element
// is not necessarily the next report — for a symbol with several scheduled
// releases it can be a quarter further out. Pick by date, not by position.
const nextUpcomingRelease = <T extends { date?: string }>(releases: T[] | undefined, from: string): T | null => {
  let next: T | null = null;
  for (const release of releases ?? []) {
    if (!release?.date || release.date < from) continue;
    if (!next || release.date < (next.date as string)) next = release;
  }
  return next;
};

export interface EarningsCalendarEntry {
  symbol: string;
  date: string;
  hour: string | null;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  quarter: number;
  year: number;
}

// Fetch the whole earnings calendar for a window in ONE request (no symbol
// filter). Callers that need earnings for many holdings must use this and filter
// locally rather than fanning out one request per symbol.
export const getBulkEarningsCalendar = (
  fromDate: string,
  toDate: string,
  options?: RequestOptions
): Promise<EarningsCalendarEntry[]> =>
  call<any>('Earnings calendar request', `/calendar/earnings?from=${fromDate}&to=${toDate}`, options).then(
    (data) => data?.earningsCalendar ?? []
  );

// One symbol's releases over a window. A window reaching into the past matters:
// entries for reports that have already happened carry epsActual/revenueActual
// once the numbers are published, which is how a release is resolved to a result.
export const getSymbolEarningsCalendar = (
  symbol: string,
  fromDate: string,
  toDate: string,
  options?: RequestOptions
): Promise<EarningsCalendarEntry[]> =>
  call<any>(
    `Earnings calendar request "${symbol}"`,
    `/calendar/earnings?symbol=${encodeURIComponent(symbol)}&from=${fromDate}&to=${toDate}`,
    options
  ).then((data) => data?.earningsCalendar ?? []);

export const getEarningsCalendar = (
  symbol: string,
  options?: RequestOptions
): Promise<EarningsCalendarEntry | null> => {
  const from = etDateAndMinutes().dateStr;
  const to = moment(from, 'YYYY-MM-DD').add(12, 'M').format('YYYY-MM-DD');
  return getSymbolEarningsCalendar(symbol, from, to, options).then((releases) => nextUpcomingRelease(releases, from));
};

export const getEarningsHistory = (symbol: string, options?: RequestOptions): Promise<any[]> =>
  call<any[]>(
    `Earnings history request "${symbol}"`,
    `/stock/earnings?symbol=${encodeURIComponent(symbol)}&limit=4`,
    options
  ).then((data) => data ?? []);

export const getInsiderTransactions = (symbol: string, options?: RequestOptions): Promise<any[]> =>
  call<any>(
    `Insider transactions request "${symbol}"`,
    `/stock/insider-transactions?symbol=${encodeURIComponent(symbol)}`,
    options
  ).then((data) => (data?.data ?? []).slice(0, 10));

export interface MarketStatusResponse {
  exchange: string;
  holiday: string | null;
  isOpen: boolean;
  session: string | null;
  timezone: string;
  t: number;
}

export const getMarketStatus = (exchange = 'US', options?: RequestOptions): Promise<MarketStatusResponse> =>
  call<MarketStatusResponse>('Market status request', `/stock/market-status?exchange=${exchange}`, options);

export const getCompanyProfile = (symbol: string, options?: RequestOptions): Promise<CompanyProfile2Response> =>
  call<CompanyProfile2Response>(
    `Company profile request "${symbol}"`,
    `/stock/profile2?symbol=${encodeURIComponent(symbol)}`,
    options
  ).then((data) => data ?? ({} as CompanyProfile2Response));
