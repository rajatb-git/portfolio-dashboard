import axios, { AxiosError, AxiosResponse } from 'axios';
import moment from 'moment';
import { IRecommendation } from '../models/RecommendationModel';
import { etDateAndMinutes } from '../utils/marketCalendar';
import { logger } from '../utils/winston';
import { CompanyProfile2Response, MarketNewsResponse, QuoteResponse, UpcomingIPOsResponse } from './types';

// Finnhub rejects bursts with HTTP 429. Every controller fans out over its
// holdings with Promise.all, so without a shared throttle a single dashboard or
// sentiment refresh can fire 40+ requests in the same tick and trip the limit.
//
// The free tier enforces two limits simultaneously — confirmed against the
// account dashboard, not just docs: FINN_HUB_BURST_LIMIT calls in any rolling
// 1-second window (default 30), and FINN_HUB_RATE_LIMIT calls in any rolling
// 60-second window (default 60). The 60s cap is what actually bounds a
// sustained fan-out — 30/s held for more than ~2s would already exceed it —
// but modeling both as real sliding windows (instead of collapsing to one
// flat rate) still lets a queue burst up to the per-second allowance
// immediately when nothing has run recently, which meaningfully speeds up
// cold-start warmup: e.g. right after a fresh migration, when every held
// symbol needs a first-ever live fetch at once.
const BURST_LIMIT = Number(process.env.FINN_HUB_BURST_LIMIT) || 30;
const BURST_WINDOW_MS = 1000;
const SUSTAINED_LIMIT = Number(process.env.FINN_HUB_RATE_LIMIT) || 60;
const SUSTAINED_WINDOW_MS = 60_000;
const MAX_RETRIES = 4;
const MAX_BACKOFF_MS = 8000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// Timestamps of recent dispatches, oldest first — pruned to the longer
// (sustained) window on every check, so this never grows past SUSTAINED_LIMIT
// entries.
const dispatchLog: number[] = [];

// Serializes callers so each one's wait-then-record happens atomically
// relative to the others: nothing can dispatch between one caller computing
// its wait and recording its own timestamp, so the two sliding windows above
// stay correct even under heavy concurrent fan-out.
let scheduleChain: Promise<void> = Promise.resolve();

const acquireSlot = (): Promise<void> => {
  const slot = scheduleChain.then(async () => {
    const now = Date.now();
    while (dispatchLog.length && now - dispatchLog[0] > SUSTAINED_WINDOW_MS) dispatchLog.shift();

    const recentBurst = dispatchLog.filter((t) => now - t <= BURST_WINDOW_MS);

    let wait = 0;
    if (dispatchLog.length >= SUSTAINED_LIMIT) {
      wait = Math.max(wait, dispatchLog[0] + SUSTAINED_WINDOW_MS - now);
    }
    if (recentBurst.length >= BURST_LIMIT) {
      wait = Math.max(wait, recentBurst[0] + BURST_WINDOW_MS - now);
    }
    if (wait > 0) await sleep(wait);

    dispatchLog.push(Date.now());
  });
  scheduleChain = slot.catch(() => undefined);
  return slot;
};

const retryAfterMs = (error: AxiosError): number | null => {
  const header = error.response?.headers?.['retry-after'];
  if (header === undefined) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds * 1000 : null;
};

// Shared Finnhub GET: throttled to stay under the rate limit and retried with
// backoff on 429 so a transient burst is absorbed instead of surfacing as an error.
const finnhubGet = async <T = any>(path: string): Promise<AxiosResponse<T>> => {
  for (let attempt = 0; ; attempt++) {
    await acquireSlot();
    try {
      return await axios.get<T>(process.env.FINN_HUB_API + path, {
        headers: { 'X-Finnhub-Token': process.env.FINN_HUB_API_KEY, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429 && attempt < MAX_RETRIES) {
        const backoff = retryAfterMs(error) ?? Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempt);
        const delay = backoff + Math.floor(Math.random() * 250);
        logger.log({
          level: 'warn',
          label: 'Finnhub rate limit',
          message: `429 on ${path}; retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`,
        });
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
};

export const getQuoteForSymbol = (symbol: string, isCrypto = false): Promise<QuoteResponse> => {
  const convertedSymbol = isCrypto ? `COINBASE:${symbol}-USDT` : symbol;

  // COINBASE:ETH-USDT
  return finnhubGet(`/quote?symbol=${convertedSymbol}`)
    .then((response) => {
      logger.log({
        level: 'info',
        response: JSON.stringify(response.data),
        label: `symbol request ${symbol}`,
        message: `${response.config.url}`,
      });

      if (response.data.c <= 0) {
        logger.log({
          level: 'error',
          label: 'Quote not found',
          message: `Quote for symbol ${symbol} not found or has a price of 0 or less`,
          ...response.data,
        });
        // throw new Error(`Quote for symbol ${symbol} not found or has a price of 0 or less`);
      }

      return response.data;
    })
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Quote request "${symbol}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });

      throw error;
    });
};

/**
 * @param  {string} symbol - stock ticker
 * @param  {string} fromDate - YYYY-MM-DD
 * @param  {string} toDate - YYYY-MM-DD
 */
export const getCompanyNews = (symbol: string, fromDate: string, toDate: string): Promise<MarketNewsResponse> =>
  finnhubGet(`/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}`)
    .then((response) => {
      logger.log({
        level: 'info',
        response: JSON.stringify(response.data),
        message: `${response.config.url}`,
        label: 'company news request',
      });

      return response.data;
    })
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Company news request "${symbol}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });

      throw error;
    });

export const getRecommendation = async (symbol: string): Promise<IRecommendation | null> =>
  finnhubGet(`/stock/recommendation?symbol=${symbol}`)
    .then((response) => {
      logger.log({
        level: 'info',
        response: JSON.stringify(response.data),
        message: `${response.config.url}`,
        label: 'recommendation request',
      });

      if (response.data.buy <= 0) {
        logger.log({
          level: 'error',
          label: 'Recommendation not found',
          message: `Recommendation for symbol ${symbol} not found or has a rating of 0 or less`,
          ...response.data,
        });

        throw new Error(`Recommendation for symbol ${symbol} not found or has a rating of 0 or less`);
      }

      if (response.data && response.data[0]) {
        return {
          buy: response.data[0].buy,
          hold: response.data[0].hold,
          period: response.data[0].period,
          sell: response.data[0].sell,
          strongBuy: response.data[0].strongBuy,
          strongSell: response.data[0].strongSell,
        };
      }

      return null;
    })
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Recommendation request "${symbol}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });

      throw error;
    });

export const getUpcomingIPOs = async (): Promise<UpcomingIPOsResponse> => {
  const fromDate = moment().subtract(2, 'M').format('YYYY-MM-DD');
  const toDate = moment().add(2, 'M').format('YYYY-MM-DD');

  return finnhubGet(`/calendar/ipo?from=${fromDate}&to=${toDate}`)
    .then((response) => {
      logger.log({
        level: 'info',
        response: JSON.stringify(response.data),
        message: `${response.config.url}`,
        label: 'ipos request',
      });

      return response.data;
    })
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: 'IPO calendar request',
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });

      throw error;
    });
};

export const getStockMetrics = (symbol: string): Promise<any> =>
  finnhubGet(`/stock/metric?symbol=${symbol}&metric=all`)
    .then((response) => {
      const m = response.data.metric;
      return {
        week52High: m['52WeekHigh'],
        week52Low: m['52WeekLow'],
        week52HighDate: m['52WeekHighDate'],
        week52LowDate: m['52WeekLowDate'],
        beta: m['beta'],
        peRatio: m['peBasicExclExtraTTM'],
        priceToBook: m['pbAnnual'],
        roeTTM: m['roeTTM'],
        revenueGrowthTTMYoy: m['revenueGrowthTTMYoy'],
        avgVolume10Day: m['10DayAverageTradingVolume'],
        shortInterest: m['shortInterest'],
        shortRatio: m['shortRatio'],
      };
    })
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Stock metrics request "${symbol}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });
      throw error;
    });

export const getStockPeers = (symbol: string): Promise<string[]> =>
  finnhubGet(`/stock/peers?symbol=${symbol}`)
    .then((response) => response.data as string[])
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Stock peers request "${symbol}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });
      throw error;
    });

export type SymbolSearchResult = {
  symbol: string;
  description: string;
  type: string;
};

// Finnhub Symbol Lookup: resolves a company name or partial ticker to matching
// symbols. Results span every exchange and instrument type, so keep only
// US-listed symbols (foreign listings carry a `.XX` exchange suffix) and cap the
// list so the search palette stays scannable.
export const searchSymbols = (query: string): Promise<SymbolSearchResult[]> =>
  finnhubGet(`/search?q=${encodeURIComponent(query)}`)
    .then((response) => {
      const results = (response.data?.result ?? []) as Array<{ symbol: string; description: string; type: string }>;
      return results
        .filter((r) => r.symbol && !r.symbol.includes('.') && r.description)
        .slice(0, 8)
        .map((r) => ({ symbol: r.symbol, description: r.description, type: r.type }));
    })
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Symbol search "${query}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });
      throw error;
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
// locally rather than fanning out one request per symbol, which trips 429s.
export const getBulkEarningsCalendar = (fromDate: string, toDate: string): Promise<EarningsCalendarEntry[]> =>
  finnhubGet(`/calendar/earnings?from=${fromDate}&to=${toDate}`)
    .then((response) => response.data.earningsCalendar ?? [])
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: 'Earnings calendar request',
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });
      throw error;
    });

// One symbol's releases over a window. A window reaching into the past matters:
// entries for reports that have already happened carry epsActual/revenueActual
// once the numbers are published, which is how a release is resolved to a result.
export const getSymbolEarningsCalendar = (
  symbol: string,
  fromDate: string,
  toDate: string
): Promise<EarningsCalendarEntry[]> =>
  finnhubGet(`/calendar/earnings?symbol=${symbol}&from=${fromDate}&to=${toDate}`)
    .then((response) => response.data.earningsCalendar ?? [])
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Earnings calendar request "${symbol}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });
      throw error;
    });

export const getEarningsCalendar = (symbol: string): Promise<EarningsCalendarEntry | null> => {
  const from = etDateAndMinutes().dateStr;
  const to = moment(from, 'YYYY-MM-DD').add(12, 'M').format('YYYY-MM-DD');
  return getSymbolEarningsCalendar(symbol, from, to).then((releases) => nextUpcomingRelease(releases, from));
};

export const getEarningsHistory = (symbol: string): Promise<any[]> =>
  finnhubGet(`/stock/earnings?symbol=${symbol}&limit=4`)
    .then((response) => response.data ?? [])
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Earnings history request "${symbol}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });
      throw error;
    });

export const getInsiderTransactions = (symbol: string): Promise<any[]> =>
  finnhubGet(`/stock/insider-transactions?symbol=${symbol}`)
    .then((response) => (response.data?.data ?? []).slice(0, 10))
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Insider transactions request "${symbol}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });
      throw error;
    });

export interface MarketStatusResponse {
  exchange: string;
  holiday: string | null;
  isOpen: boolean;
  session: string | null;
  timezone: string;
  t: number;
}

export const getMarketStatus = (exchange = 'US'): Promise<MarketStatusResponse> =>
  finnhubGet(`/stock/market-status?exchange=${exchange}`)
    .then((response) => {
      logger.log({
        level: 'info',
        response: JSON.stringify(response.data),
        message: `${response.config.url}`,
        label: 'market status request',
      });

      return response.data;
    })
    .catch((error: AxiosError) => {
      logger.log({ level: 'error', label: error.status, message: error.message });
      throw error;
    });

export const getCompanyProfile = (symbol: string): Promise<CompanyProfile2Response> =>
  finnhubGet(`/stock/profile2?symbol=${symbol}`)
    .then((response) => {
      logger.log({
        level: 'info',
        response: JSON.stringify(response.data),
        message: `${response.config.url}`,
        label: 'company profile request',
      });

      return response.data;
    })
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Company profile request "${symbol}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });

      throw error;
    });
