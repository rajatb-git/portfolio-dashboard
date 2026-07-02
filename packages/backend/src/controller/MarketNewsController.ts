import moment from 'moment';
import { getTopBusinessHeadlines } from '../externalApis/newsApi';
import { CacheDBModel } from '../models/CacheModel';
import { logger } from '../utils/winston';

// Top US business headlines, sourced directly from NewsAPI's editor-ranked
// top-headlines feed. Public news data only — no AI provider and no personal
// portfolio data involved.

export type MarketNewsArticle = {
  headline: string;
  summary: string;
  source: string;
  url: string;
  imageUrl: string;
  publishedAt: string;
};

export type MarketNewsDigest = {
  articles: MarketNewsArticle[];
  source: string;
  generatedAt: string;
};

const CACHE_KEY = 'market_news_top10';
const CACHE_MINUTES = 30;
const LABEL = 'MarketNews';

export class MarketNewsController {
  getTopNews = async (forceRefresh = false): Promise<MarketNewsDigest> => {
    const cacheModel = await CacheDBModel().initialize();
    const cached = cacheModel.findById(CACHE_KEY);

    if (!forceRefresh && cached && moment().diff(moment(cached.updatedAt), 'minutes') < CACHE_MINUTES) {
      try {
        return JSON.parse(cached.value);
      } catch {
        // stale/corrupt cache, refetch
      }
    }

    const articles = await getTopBusinessHeadlines(10);
    if (articles.length === 0) {
      throw new Error('No market news available from the data source right now');
    }

    const digest: MarketNewsDigest = { articles, source: 'NewsAPI', generatedAt: moment().toISOString() };
    await cacheModel.insertOrUpdate({ key: CACHE_KEY, value: JSON.stringify(digest) }, CACHE_KEY);
    logger.log({ level: 'info', label: LABEL, message: `Fetched ${articles.length} top business headlines` });

    return digest;
  };
}
