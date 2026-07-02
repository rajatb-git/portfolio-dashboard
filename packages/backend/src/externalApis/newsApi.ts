import axios, { AxiosError } from 'axios';
import { logger } from '../utils/winston';

// Editor-ranked top US business headlines from NewsAPI (https://newsapi.org).
// Public news data only — no personal/portfolio data is ever sent. Requires a
// free API key in NEWS_API_KEY (backend environment), same as the Finnhub key.

export type TopHeadline = {
  headline: string;
  summary: string;
  source: string;
  url: string;
  imageUrl: string;
  publishedAt: string;
};

export const getTopBusinessHeadlines = async (limit = 10): Promise<TopHeadline[]> => {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    throw new Error('NewsAPI is not configured — set NEWS_API_KEY in the backend environment');
  }

  const url = `https://newsapi.org/v2/top-headlines?country=us&category=business&pageSize=${limit}`;

  return axios
    .get(url, { headers: { 'X-Api-Key': apiKey, 'User-Agent': 'portfolio-dashboard' } })
    .then((response) => {
      const articles: any[] = response.data?.articles ?? [];
      return articles
        .slice(0, limit)
        .map((a) => ({
          headline: String(a.title ?? '').trim(),
          summary: String(a.description ?? '').trim(),
          source: String(a.source?.name ?? '').trim(),
          url: String(a.url ?? '').trim(),
          imageUrl: String(a.urlToImage ?? '').trim(),
          publishedAt: String(a.publishedAt ?? '').trim(),
        }))
        .filter((a) => a.headline && a.headline !== '[Removed]');
    })
    .catch((error: AxiosError) => {
      // NewsAPI returns a JSON { message } on errors (e.g. invalid key, plan limits).
      const apiMessage = (error.response?.data as any)?.message;
      logger.log({
        level: 'error',
        label: `NewsAPI ${error.response?.status ?? ''}`,
        message: apiMessage || error.message,
      });
      throw new Error(apiMessage || error.message);
    });
};
