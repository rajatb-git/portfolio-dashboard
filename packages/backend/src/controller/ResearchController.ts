import { type EarningsCalendarEntry, nextUpcomingRelease } from '../externalApis/finnHub';
import type { CompanyProfile2Response } from '../externalApis/types';
import type { DatasetName, NewsArticle, Quote } from '../marketData/datasets';
import { quoteKey } from '../marketData/datasets';
import { type MarketRead, read } from '../marketData/store';
import { HoldingsModel } from '../models/HoldingsModel';
import { etDateAndMinutes } from '../utils/marketCalendar';

// Everything the Research page shows comes from the market data store. Every
// held symbol is kept warm by the scheduler, so those open from stored data; a
// symbol nobody holds waits at most the store's deadline per card and then
// answers pending, and the page asks again. Each read also marks the symbol as
// viewed, which keeps it fresh for as long as the page stays open.
//
// `force` is the refresh button: it bypasses freshness and waits for the
// provider, so the click visibly replaces what is on screen.

const NEWS_LOOKBACK_DAYS = 3;

export type CompanyProfile2 = {
  country: string;
  currency: string;
  exchange: string;
  industry: string;
  ipo: string;
  logo: string;
  marketCap: number;
  name: string;
  shareOutstanding: number;
  ticker: string;
};

// A ticker held as crypto (BTC, ETH) is priced from the crypto feed. Its stock
// namesake on US exchanges (BTC is a bitcoin ETF) has a profile, filings and
// analysts that would describe the wrong thing, so those cards stay empty.
const isHeldCrypto = async (symbol: string): Promise<boolean> =>
  (await HoldingsModel().initialize())
    .getAllRecords()
    .some((h) => h.type === 'crypto' && h.symbol?.toUpperCase() === symbol);

const STOCK_ONLY_EMPTY: Partial<Record<DatasetName, unknown>> = {
  recommendation: null,
  profile: {},
  metrics: null,
  peers: [],
  earnings: [],
  earningsHistory: [],
  insider: [],
  news: [],
};

const researchRead = async <T>(dataset: DatasetName, key: string, force: boolean): Promise<MarketRead<T>> => {
  if (dataset !== 'quote' && (await isHeldCrypto(key))) {
    return { value: STOCK_ONLY_EMPTY[dataset] as T, fetchedAt: null, fresh: true, pending: false, error: null };
  }
  return read<T>(dataset, key, { mode: force ? 'force' : 'fresh', view: true });
};

const mapRead = <T, R>(result: MarketRead<T>, map: (value: T) => R): MarketRead<R> => ({
  ...result,
  value: result.value === null ? null : map(result.value),
});

export class ResearchController {
  getQuote = async (symbol: string, force = false): Promise<MarketRead<Quote>> =>
    researchRead<Quote>('quote', quoteKey(symbol, await isHeldCrypto(symbol)), force);

  getRecommendation = (symbol: string, force = false) => researchRead('recommendation', symbol, force);

  getProfile = async (symbol: string, force = false): Promise<MarketRead<CompanyProfile2>> =>
    mapRead(await researchRead<CompanyProfile2Response>('profile', symbol, force), (p) => ({
      country: p.country,
      currency: p.currency,
      exchange: p.exchange,
      industry: p.finnhubIndustry,
      ipo: p.ipo,
      logo: p.logo,
      marketCap: p.marketCapitalization,
      name: p.name,
      shareOutstanding: p.shareOutstanding,
      ticker: p.ticker,
    }));

  getMetrics = (symbol: string, force = false) => researchRead('metrics', symbol, force);

  getPeers = (symbol: string, force = false) => researchRead<string[]>('peers', symbol, force);

  getEarnings = async (symbol: string, force = false): Promise<MarketRead<EarningsCalendarEntry | null>> =>
    mapRead(await researchRead<EarningsCalendarEntry[]>('earnings', symbol, force), (releases) =>
      nextUpcomingRelease(releases, etDateAndMinutes().dateStr)
    );

  getEarningsHistory = (symbol: string, force = false) => researchRead<any[]>('earningsHistory', symbol, force);

  getInsiderTransactions = (symbol: string, force = false) => researchRead<any[]>('insider', symbol, force);

  // The store keeps a week of news per symbol; the page shows the last few days.
  getNews = async (symbol: string, force = false): Promise<MarketRead<NewsArticle[]>> => {
    const cutoff = Date.now() / 1000 - NEWS_LOOKBACK_DAYS * 24 * 60 * 60;
    return mapRead(await researchRead<NewsArticle[]>('news', symbol, force), (articles) =>
      articles.filter((a) => a.datetime >= cutoff)
    );
  };
}
