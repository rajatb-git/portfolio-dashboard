import moment from 'moment';
import { getActiveProvider } from '../aiProviders';
import { getMarketNews } from '../externalApis/finnHub';
import { CacheDBModel } from '../models/CacheModel';
import { logger } from '../utils/winston';

// PRIVACY: this is the second feature (besides AgentInsightsController) allowed to
// call getActiveProvider(). The prompt below contains ONLY public general-market
// news headlines from Finnhub — no holdings, quantities, values, or P&L. It must
// stay that way: never pass portfolio data into this prompt.

export type MarketNewsArticle = {
  headline: string;
  summary: string;
  category: string;
  source: string;
  url: string;
};

export type MarketNewsDigest = {
  articles: MarketNewsArticle[];
  provider: string;
  model: string;
  generatedAt: string;
};

const CACHE_KEY = 'market_news_top10';
const CACHE_MINUTES = 60;
const LABEL = 'MarketNews';

const SYSTEM_PROMPT = `You are a financial news editor curating the day's most important US stock-market stories for equity investors.

You will be given a numbered list of real market-news items published today. Select the 10 most significant and market-moving, and write a single concise sentence summarizing each. Only use the items provided — do not invent stories. Copy the "source" and "url" verbatim from the item you selected; never fabricate a URL.

Respond ONLY with valid JSON matching this exact schema (no markdown, no code fences):
{
  "articles": [
    { "headline": "concise headline", "summary": "one-sentence why-it-matters", "category": "e.g. macro, earnings, tech, energy", "source": "publisher", "url": "https://..." }
  ]
}
Return exactly 10 articles when the input has at least 10; otherwise return as many as are available, most significant first.`;

export class MarketNewsController {
  getTopNews = async (forceRefresh = false): Promise<MarketNewsDigest> => {
    const cacheModel = await CacheDBModel().initialize();
    const cached = cacheModel.findById(CACHE_KEY);

    if (!forceRefresh && cached && moment().diff(moment(cached.updatedAt), 'minutes') < CACHE_MINUTES) {
      try {
        return JSON.parse(cached.value);
      } catch {
        // stale/corrupt cache, regenerate
      }
    }

    const provider = await getActiveProvider();

    const news = await getMarketNews('general');
    if (!news || news.length === 0) {
      throw new Error('No market news available from the data source right now');
    }

    const sourceList = news
      .slice(0, 40)
      .map(
        (n, i) =>
          `${i + 1}. [${n.category || 'general'}] ${n.headline}${n.summary ? ` — ${n.summary}` : ''} | source: ${
            n.source || 'unknown'
          } | url: ${n.url || ''}`
      )
      .join('\n');

    const prompt = `Here are today's market-news items:\n\n${sourceList}\n\nSelect and summarize the 10 most significant for US equity investors.`;

    const rawText = await provider.generateInsight(SYSTEM_PROMPT, prompt);
    const cleaned = rawText.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();

    let articles: MarketNewsArticle[];
    try {
      const parsed = JSON.parse(cleaned);
      const list = Array.isArray(parsed) ? parsed : parsed.articles;
      articles = (list ?? [])
        .slice(0, 10)
        .map((a: any) => ({
          headline: String(a.headline ?? '').trim(),
          summary: String(a.summary ?? '').trim(),
          category: String(a.category ?? 'general').trim(),
          source: String(a.source ?? '').trim(),
          url: String(a.url ?? '').trim(),
        }))
        .filter((a: MarketNewsArticle) => a.headline);
    } catch (_err) {
      logger.log({ level: 'error', label: LABEL, message: `Failed to parse response from ${provider.name}: ${cleaned}` });
      throw new Error(`Failed to parse ${provider.name} response as JSON`);
    }

    if (articles.length === 0) {
      throw new Error(`${provider.name} returned no articles`);
    }

    const digest: MarketNewsDigest = {
      articles,
      provider: provider.name,
      model: provider.model,
      generatedAt: moment().toISOString(),
    };

    await cacheModel.insertOrUpdate({ key: CACHE_KEY, value: JSON.stringify(digest) }, CACHE_KEY);

    return digest;
  };
}
