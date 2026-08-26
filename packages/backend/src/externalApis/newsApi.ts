import axios, { AxiosError } from 'axios';
import { XMLParser } from 'fast-xml-parser';
import moment from 'moment';
import { logger } from '../utils/winston';

// US market headlines aggregated from public financial-news RSS feeds. Public
// news data only — no personal/portfolio data is ever sent, no API key required,
// and the feeds are near real-time (unlike NewsAPI's free-tier 24h+ delay).

export type NewsCategory = 'markets' | 'business' | 'stocks' | 'economy' | 'tech' | 'crypto';

export const NEWS_CATEGORIES: NewsCategory[] = ['markets', 'business', 'stocks', 'economy', 'tech', 'crypto'];

export type TopHeadline = {
  headline: string;
  summary: string;
  source: string;
  url: string;
  imageUrl: string;
  publishedAt: string;
  category: NewsCategory;
};

type Feed = { url: string; brand: string; category: NewsCategory };

// Spread across several publishers so one outlet going down (or rate-limiting a
// self-hosted box) degrades the digest instead of emptying it.
const FEEDS: Feed[] = [
  { url: 'https://www.cnbc.com/id/20910258/device/rss/rss.html', brand: 'CNBC', category: 'business' },
  { url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html', brand: 'CNBC', category: 'markets' },
  { url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', brand: 'WSJ', category: 'markets' },
  { url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', brand: 'MarketWatch', category: 'markets' },
  { url: 'https://feeds.content.dowjones.io/public/rss/mw_marketpulse', brand: 'MarketWatch', category: 'stocks' },
  { url: 'https://www.nasdaq.com/feed/rssoutbound?category=Markets', brand: 'Nasdaq', category: 'markets' },
  { url: 'https://www.nasdaq.com/feed/rssoutbound?category=Stocks', brand: 'Nasdaq', category: 'stocks' },
  { url: 'https://www.investing.com/rss/news_25.rss', brand: 'Investing.com', category: 'stocks' },
  { url: 'https://www.investing.com/rss/news_14.rss', brand: 'Investing.com', category: 'economy' },
  { url: 'https://seekingalpha.com/market_currents.xml', brand: 'Seeking Alpha', category: 'stocks' },
  { url: 'https://feeds.content.dowjones.io/public/rss/RSSWSJD', brand: 'WSJ', category: 'tech' },
  { url: 'https://cointelegraph.com/rss', brand: 'Cointelegraph', category: 'crypto' },
];

const LABEL = 'MarketNewsRSS';
const PER_FEED_TIMEOUT_MS = 8000;
// Cap per feed so a publisher that posts 60 items an hour can't crowd every
// other outlet out of the digest.
const PER_FEED_LIMIT = 12;
const MAX_SUMMARY_CHARS = 260;
const DATE_FORMATS = [moment.ISO_8601, moment.RFC_2822, 'YYYY-MM-DD HH:mm:ss'];

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

const asArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const text = (value: unknown): string => {
  if (value == null) return '';
  // fast-xml-parser exposes an element's text as `#text` when it also has attributes.
  if (typeof value === 'object' && '#text' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)['#text'] ?? '').trim();
  }
  return String(value).trim();
};

// Feed descriptions routinely carry markup, tracking pixels and a trailing
// "Continue reading" link; the card renders plain text, so flatten it here.
const plainText = (raw: string): string => {
  const stripped = raw
    .replace(/<[^>]*>/g, ' ')
    // Publishers escape curly quotes and dashes as numeric entities; left as-is
    // they show up verbatim in the headline.
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.length > MAX_SUMMARY_CHARS ? `${stripped.slice(0, MAX_SUMMARY_CHARS).trimEnd()}…` : stripped;
};

const parsePublished = (raw: string): moment.Moment => {
  const m = moment(raw, DATE_FORMATS, true);
  return m.isValid() ? m : moment(raw);
};

const imageFrom = (item: Record<string, any>): string => {
  const enclosure = item.enclosure?.['@_url'];
  const media =
    item['media:content']?.['@_url'] ??
    item['media:thumbnail']?.['@_url'] ??
    asArray<Record<string, any>>(item['media:content'])[0]?.['@_url'];
  return String(enclosure ?? media ?? '').trim();
};

// Two outlets syndicating the same wire story rarely share a URL, so match on the
// headline reduced to its significant words — that catches "Fed holds rates
// steady" vs "Fed Holds Rates Steady, Powell Says…" as well as exact repeats.
const dedupeKey = (headline: string): string =>
  headline
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 8)
    .join(' ');

type RankedHeadline = TopHeadline & { _sortKey: number };

const fetchFeed = async (feed: Feed): Promise<RankedHeadline[]> => {
  const response = await axios.get<string>(feed.url, {
    timeout: PER_FEED_TIMEOUT_MS,
    responseType: 'text',
    headers: { 'User-Agent': 'portfolio-dashboard', Accept: 'application/rss+xml, application/xml, text/xml' },
  });

  const items = asArray<Record<string, any>>(parser.parse(response.data)?.rss?.channel?.item);

  return items
    .map((item) => {
      const published = parsePublished(text(item.pubDate));
      return {
        headline: plainText(text(item.title)),
        summary: plainText(text(item.description)),
        source: feed.brand,
        url: text(item.link),
        imageUrl: imageFrom(item),
        publishedAt: published.isValid() ? published.toISOString() : '',
        category: feed.category,
        _sortKey: published.isValid() ? published.valueOf() : 0,
      };
    })
    .filter((a) => a.headline)
    .sort((a, b) => b._sortKey - a._sortKey)
    .slice(0, PER_FEED_LIMIT);
};

// Aggregated headlines, newest first. `categories` narrows which feeds are hit at
// all, so a request for crypto news doesn't pay for every markets feed.
export const getTopBusinessHeadlines = async (limit = 10, categories?: NewsCategory[]): Promise<TopHeadline[]> => {
  const feeds = categories?.length ? FEEDS.filter((f) => categories.includes(f.category)) : FEEDS;
  const results = await Promise.allSettled(feeds.map(fetchFeed));

  const collected: RankedHeadline[] = [];
  let failed = 0;
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      collected.push(...result.value);
    } else {
      failed++;
      const err = result.reason as AxiosError;
      logger.log({
        level: 'error',
        label: `${LABEL} ${err.response?.status ?? ''}`.trim(),
        message: `${feeds[i].url}: ${err.message ?? String(result.reason)}`,
      });
    }
  });

  const seen = new Set<string>();
  const deduped = collected
    .sort((a, b) => b._sortKey - a._sortKey)
    .filter((a) => {
      const key = dedupeKey(a.headline);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map(({ _sortKey, ...article }) => article);

  logger.log({
    level: 'info',
    label: LABEL,
    message: `Aggregated ${deduped.length} headlines from ${feeds.length - failed}/${feeds.length} feeds`,
  });

  return deduped;
};
