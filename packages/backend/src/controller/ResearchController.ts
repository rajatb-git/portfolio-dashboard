import type { CompanyProfile2Response } from '../externalApis/types';
import type { DatasetName, NewsArticle, Quote } from '../marketData/datasets';
import { quoteKey } from '../marketData/datasets';
import { type MarketRead, read } from '../marketData/store';

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

const researchRead = <T>(dataset: DatasetName, key: string, force: boolean): Promise<MarketRead<T>> =>
  read<T>(dataset, key, { mode: force ? 'force' : 'fresh', view: true });

const mapRead = <T, R>(result: MarketRead<T>, map: (value: T) => R): MarketRead<R> => ({
  ...result,
  value: result.value === null ? null : map(result.value),
});

export class ResearchController {
  getQuote = (symbol: string, force = false): Promise<MarketRead<Quote>> =>
    researchRead<Quote>('quote', quoteKey(symbol, false), force);

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

  getEarnings = (symbol: string, force = false) => researchRead('earningsNext', symbol, force);

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
