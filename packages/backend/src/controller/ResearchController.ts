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

// `force` comes from the Research page's refresh button, which has to bypass these
// TTLs — otherwise the click re-renders exactly the cached payload the user pressed
// it to get rid of.
export class ResearchController {
  getMetrics = (symbol: string, force = false): Promise<any> =>
    cachedFetch(`research_metrics_${symbol}`, TTL_MINUTES.metrics, () => getStockMetrics(symbol), force);

  getPeers = (symbol: string, force = false): Promise<string[]> =>
    cachedFetch(`research_peers_${symbol}`, TTL_MINUTES.peers, () => getStockPeers(symbol), force);

  getEarnings = (symbol: string, force = false): Promise<any> =>
    cachedFetch(`research_earnings_${symbol}`, TTL_MINUTES.earnings, () => getEarningsCalendar(symbol), force);

  getEarningsHistory = (symbol: string, force = false): Promise<any[]> =>
    cachedFetch(
      `research_earnings_history_${symbol}`,
      TTL_MINUTES.earningsHistory,
      () => getEarningsHistory(symbol),
      force
    );

  getInsiderTransactions = (symbol: string, force = false): Promise<any[]> =>
    cachedFetch(`research_insider_${symbol}`, TTL_MINUTES.insider, () => getInsiderTransactions(symbol), force);

  // The date window is computed inside the fetcher so it moves with each refresh
  // rather than being pinned into the cache key.
  getNews = (symbol: string, force = false): Promise<MarketNewsResponse> =>
    cachedFetch(
      `research_news_${symbol}`,
      TTL_MINUTES.news,
      () =>
        getCompanyNews(
          symbol,
          moment().subtract(NEWS_LOOKBACK_DAYS, 'days').format('YYYY-MM-DD'),
          moment().format('YYYY-MM-DD')
        ),
      force
    );
}
