import moment from 'moment';
import { getCompanyNews } from '../externalApis/finnHub';
import { getTopBusinessHeadlines, type NewsCategory, NEWS_CATEGORIES } from '../externalApis/newsApi';
import { CacheDBModel } from '../models/CacheModel';
import { HoldingsModel } from '../models/HoldingsModel';
import { matchedPatterns, normalizeCompanyName, relatedSymbol } from '../utils/newsRelevance';
import { logger } from '../utils/winston';

// Market headlines from public financial-news RSS feeds, plus per-ticker company
// news from Finnhub for the symbols the user holds. Public news data only — no AI
// provider is involved, and nothing about the size or value of a position leaves
// this process: the holdings are used purely to pick which public tickers to look
// up and which headlines to tag.

export type MarketNewsArticle = {
  headline: string;
  summary: string;
  source: string;
  url: string;
  imageUrl: string;
  publishedAt: string;
  category: string;
  // Set when the story names a held ticker or its company.
  symbol: string | null;
  // Matched market-moving keywords, empty for routine coverage.
  keywords: string[];
  breaking: boolean;
};

export type MarketNewsDigest = {
  articles: MarketNewsArticle[];
  categories: string[];
  source: string;
  generatedAt: string;
};

const TOP_CACHE_KEY = 'market_news_top';
const PORTFOLIO_CACHE_KEY = 'market_news_portfolio';
const CACHE_MINUTES = 15;
const LABEL = 'MarketNews';

const TOP_LIMIT = 12;
const PORTFOLIO_LIMIT = 20;
// Finnhub's free tier rate-limits hard, so company news is fetched for the
// holdings a few at a time rather than fanning out over the whole portfolio.
const SYMBOL_CONCURRENCY = 4;
const COMPANY_NEWS_LOOKBACK_DAYS = 3;

const isValidCategory = (value: string): value is NewsCategory => (NEWS_CATEGORIES as string[]).includes(value);

const cacheKeyFor = (base: string, categories: NewsCategory[]): string =>
  categories.length ? `${base}_${[...categories].sort().join('-')}` : base;

const tag = (article: Omit<MarketNewsArticle, 'symbol' | 'keywords' | 'breaking'>, symbol: string | null) => {
  const keywords = matchedPatterns(`${article.headline} ${article.summary}`);
  return { ...article, symbol, keywords, breaking: keywords.length > 0 };
};

export class MarketNewsController {
  // Distinct stock tickers held, mapped to a normalized company name so broad
  // headlines can be matched back to a position.
  private heldSymbols = async (): Promise<Map<string, string>> => {
    const holdingsModel = await HoldingsModel().initialize();
    const watched = new Map<string, string>();
    for (const holding of holdingsModel.getAllRecords()) {
      if (holding.type !== 'stock') continue;
      if (!watched.has(holding.symbol)) watched.set(holding.symbol, normalizeCompanyName(holding.name));
    }
    return watched;
  };

  private readCache = async (key: string, forceRefresh: boolean): Promise<MarketNewsDigest | null> => {
    if (forceRefresh) return null;
    const cacheModel = await CacheDBModel().initialize();
    const cached = cacheModel.findById(key);
    if (!cached || moment().diff(moment(cached.updatedAt), 'minutes') >= CACHE_MINUTES) return null;
    try {
      return JSON.parse(cached.value);
    } catch {
      // stale/corrupt cache, refetch
      return null;
    }
  };

  private writeCache = async (key: string, digest: MarketNewsDigest): Promise<void> => {
    const cacheModel = await CacheDBModel().initialize();
    await cacheModel.insertOrUpdate({ key, value: JSON.stringify(digest) }, key);
  };

  // Top market headlines, optionally narrowed to one or more categories, with
  // stories about the user's own holdings tagged with their ticker.
  getTopNews = async (forceRefresh = false, requested: string[] = []): Promise<MarketNewsDigest> => {
    const categories = requested.filter(isValidCategory);
    const cacheKey = cacheKeyFor(TOP_CACHE_KEY, categories);

    const cached = await this.readCache(cacheKey, forceRefresh);
    if (cached) return cached;

    const [headlines, watched] = await Promise.all([
      getTopBusinessHeadlines(TOP_LIMIT, categories),
      this.heldSymbols().catch((): Map<string, string> => new Map()),
    ]);

    if (headlines.length === 0) {
      throw new Error('No market news available from the data source right now');
    }

    const digest: MarketNewsDigest = {
      articles: headlines.map((a) => tag(a, relatedSymbol(`${a.headline} ${a.summary}`, watched))),
      categories: categories.length ? categories : [...NEWS_CATEGORIES],
      source: 'RSS',
      generatedAt: moment().toISOString(),
    };

    await this.writeCache(cacheKey, digest);
    logger.log({
      level: 'info',
      label: LABEL,
      message: `Fetched ${digest.articles.length} headlines (${digest.categories.join(', ')})`,
    });

    return digest;
  };

  // News about the tickers actually held: Finnhub company news per symbol, plus
  // any broad-market headline that names a holding. Sorted newest first, with
  // market-moving stories floated to the top of each timestamp.
  getPortfolioNews = async (forceRefresh = false): Promise<MarketNewsDigest> => {
    const cached = await this.readCache(PORTFOLIO_CACHE_KEY, forceRefresh);
    if (cached) return cached;

    const watched = await this.heldSymbols();
    if (watched.size === 0) {
      return { articles: [], categories: [], source: 'Finnhub + RSS', generatedAt: moment().toISOString() };
    }

    const [companyArticles, marketArticles] = await Promise.all([
      this.companyNews([...watched.keys()]),
      getTopBusinessHeadlines(TOP_LIMIT * 2)
        .then((headlines) =>
          headlines
            .map((a) => ({ article: a, symbol: relatedSymbol(`${a.headline} ${a.summary}`, watched) }))
            .filter((entry): entry is { article: (typeof headlines)[number]; symbol: string } => !!entry.symbol)
            .map(({ article, symbol }) => tag(article, symbol))
        )
        .catch((err: any) => {
          logger.log({ level: 'error', label: LABEL, message: `Market headlines failed: ${err.message}` });
          return [] as MarketNewsArticle[];
        }),
    ]);

    const seen = new Set<string>();
    const articles = [...companyArticles, ...marketArticles]
      .filter((a) => {
        const key = (a.url || a.headline).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => moment(b.publishedAt).valueOf() - moment(a.publishedAt).valueOf())
      .slice(0, PORTFOLIO_LIMIT);

    const digest: MarketNewsDigest = {
      articles,
      categories: [...new Set(articles.map((a) => a.category))],
      source: 'Finnhub + RSS',
      generatedAt: moment().toISOString(),
    };

    await this.writeCache(PORTFOLIO_CACHE_KEY, digest);
    logger.log({
      level: 'info',
      label: LABEL,
      message: `Fetched ${articles.length} article(s) across ${watched.size} held symbol(s)`,
    });

    return digest;
  };

  private companyNews = async (symbols: string[]): Promise<MarketNewsArticle[]> => {
    const from = moment().subtract(COMPANY_NEWS_LOOKBACK_DAYS, 'days').format('YYYY-MM-DD');
    const to = moment().format('YYYY-MM-DD');
    const out: MarketNewsArticle[] = [];

    for (let i = 0; i < symbols.length; i += SYMBOL_CONCURRENCY) {
      const batch = symbols.slice(i, i + SYMBOL_CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (symbol) => {
          const articles = await getCompanyNews(symbol, from, to);
          // Finnhub returns the whole window newest-first; a couple per holding is
          // plenty once every position contributes.
          return articles.slice(0, 3).map((a) =>
            tag(
              {
                headline: a.headline ?? '',
                summary: a.summary ?? '',
                source: a.source || 'Finnhub',
                url: a.url ?? '',
                imageUrl: a.image ?? '',
                publishedAt: a.datetime ? moment.unix(a.datetime).toISOString() : '',
                category: 'holdings',
              },
              symbol
            )
          );
        })
      );

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          out.push(...result.value.filter((a) => a.headline));
        } else {
          logger.log({
            level: 'error',
            label: LABEL,
            message: `Company news failed for ${batch[idx]}: ${result.reason?.message ?? result.reason}`,
          });
        }
      });
    }

    return out;
  };
}
