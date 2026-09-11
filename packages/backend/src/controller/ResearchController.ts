import moment from 'moment';
import {
  getCompanyNews,
  getEarningsCalendar,
  getEarningsHistory,
  getInsiderTransactions,
  getStockMetrics,
  getStockPeers,
} from '../externalApis/finnHub';
import type { MarketNewsResponse } from '../externalApis/types';
import { cachedFetch } from '../utils/cachedFetch';

// Everything the Research page renders apart from the quote, which has its own
// price store. These were going to Finnhub live on every page view, so opening the
// same ticker twice cost another nine calls against a 60-per-minute budget and
// every card sat on a skeleton until the network came back. They are cached and
// revalidated in the background instead: a revisit paints from cache immediately.
//
// TTLs track how fast each thing actually moves — a peer list or a company profile
// is effectively static, insider filings and earnings dates change daily, news
// within the hour.
const TTL_MINUTES = {
  metrics: 6 * 60,
  peers: 24 * 60,
  earnings: 6 * 60,
  earningsHistory: 12 * 60,
  insider: 6 * 60,
  news: 15,
} as const;

const NEWS_LOOKBACK_DAYS = 3;

export class ResearchController {
  getMetrics = (symbol: string): Promise<any> =>
    cachedFetch(`research_metrics_${symbol}`, TTL_MINUTES.metrics, () => getStockMetrics(symbol));

  getPeers = (symbol: string): Promise<string[]> =>
    cachedFetch(`research_peers_${symbol}`, TTL_MINUTES.peers, () => getStockPeers(symbol));

  getEarnings = (symbol: string): Promise<any> =>
    cachedFetch(`research_earnings_${symbol}`, TTL_MINUTES.earnings, () => getEarningsCalendar(symbol));

  getEarningsHistory = (symbol: string): Promise<any[]> =>
    cachedFetch(`research_earnings_history_${symbol}`, TTL_MINUTES.earningsHistory, () => getEarningsHistory(symbol));

  getInsiderTransactions = (symbol: string): Promise<any[]> =>
    cachedFetch(`research_insider_${symbol}`, TTL_MINUTES.insider, () => getInsiderTransactions(symbol));

  // The date window is computed inside the fetcher so it moves with each refresh
  // rather than being pinned into the cache key.
  getNews = (symbol: string): Promise<MarketNewsResponse> =>
    cachedFetch(`research_news_${symbol}`, TTL_MINUTES.news, () =>
      getCompanyNews(
        symbol,
        moment().subtract(NEWS_LOOKBACK_DAYS, 'days').format('YYYY-MM-DD'),
        moment().format('YYYY-MM-DD')
      )
    );
}
