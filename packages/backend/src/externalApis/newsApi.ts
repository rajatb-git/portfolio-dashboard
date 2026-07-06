import axios, { AxiosError } from 'axios';
import { XMLParser } from 'fast-xml-parser';
import moment from 'moment';
import { logger } from '../utils/winston';

// Top US market headlines aggregated from public financial-news RSS feeds
// (CNBC, Nasdaq). Public news data only — no personal/portfolio data is ever
// sent, no API key required, and the feeds are near real-time (unlike NewsAPI's
// free-tier 24h+ delay).

export type TopHeadline = {
  headline: string;
  summary: string;
  source: string;
  url: string;
  imageUrl: string;
  publishedAt: string;
};

type Feed = { url: string; brand: string };

const FEEDS: Feed[] = [
  { url: 'https://www.cnbc.com/id/20910258/device/rss/rss.html', brand: 'CNBC' },
  { url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html', brand: 'CNBC' },
  { url: 'https://www.nasdaq.com/feed/rssoutbound?category=Markets', brand: 'Nasdaq' },
];

const LABEL = 'MarketNewsRSS';
const PER_FEED_TIMEOUT_MS = 8000;
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

const parsePublished = (raw: string): moment.Moment => {
  const m = moment(raw, DATE_FORMATS, true);
  return m.isValid() ? m : moment(raw);
};

const imageFrom = (item: Record<string, any>): string => {
  const enclosure = item.enclosure?.['@_url'];
  const media = item['media:content']?.['@_url'] ?? item['media:thumbnail']?.['@_url'];
  return String(enclosure ?? media ?? '').trim();
};

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
        headline: text(item.title),
        summary: text(item.description),
        source: text(item['dc:creator']) || feed.brand,
        url: text(item.link),
        imageUrl: imageFrom(item),
        publishedAt: published.isValid() ? published.toISOString() : '',
        _sortKey: published.isValid() ? published.valueOf() : 0,
      };
    })
    .filter((a) => a.headline);
};

export const getTopBusinessHeadlines = async (limit = 10): Promise<TopHeadline[]> => {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));

  const collected: RankedHeadline[] = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      collected.push(...result.value);
    } else {
      const err = result.reason as AxiosError;
      logger.log({
        level: 'error',
        label: `${LABEL} ${err.response?.status ?? ''}`.trim(),
        message: `${FEEDS[i].url}: ${err.message ?? String(result.reason)}`,
      });
    }
  });

  const seen = new Set<string>();
  const deduped = collected
    .sort((a, b) => b._sortKey - a._sortKey)
    .filter((a) => {
      const key = a.headline.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map(({ _sortKey, ...article }) => article);

  logger.log({
    level: 'info',
    label: LABEL,
    message: `Aggregated ${deduped.length} headlines from ${FEEDS.length} feeds`,
  });

  return deduped;
};
