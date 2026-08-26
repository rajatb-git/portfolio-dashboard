import { createHash } from 'node:crypto';
import moment from 'moment';
import { getCompanyNews } from '../externalApis/finnHub';
import { getTopBusinessHeadlines } from '../externalApis/newsApi';
import { HoldingsModel } from '../models/HoldingsModel';
import { getJobState, setJobState } from '../models/JobRunStateModel';
import {
  DEFAULT_NEWS_WATCH_CONFIG,
  getNewsWatchConfig,
  type INewsWatchConfig,
} from '../models/NewsWatchConfigModel';
import { SeenNewsDBModel } from '../models/SeenNewsModel';
import { PersistentInterval } from '../utils/PersistentInterval';
import { matchedPatterns, normalizeCompanyName, relatedSymbol } from '../utils/newsRelevance';
import { logger } from '../utils/winston';
import { mqttPublisher } from './MqttPublisher';
import { buildNewsAlertPayload, dispatchNewsAlert } from './NotificationDispatcher';

const LABEL = 'NewsWatchService';

// Set once a baseline has been recorded, so switching the watcher on doesn't
// blast a notification for every story already on the wire.
const SEEDED_KEY = 'news_watch:seeded';

// Drop delivered-article records after this long; the lookback window means
// anything older can never be a duplicate candidate again.
const SEEN_RETENTION_DAYS = 7;

// Finnhub's free tier is rate limited, so holdings are polled a few at a time
// rather than all at once.
const SYMBOL_CONCURRENCY = 4;

type Candidate = {
  symbol: string | null;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
};

const articleKey = (url: string, headline: string): string =>
  createHash('sha1')
    .update(url || headline)
    .digest('hex')
    .slice(0, 32);

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R[]>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const results = await Promise.allSettled(batch.map(worker));
    for (const result of results) {
      if (result.status === 'fulfilled') out.push(...result.value);
    }
  }
  return out;
}

class NewsWatchService {
  private readonly scheduler = new PersistentInterval('news_watch');
  private config: INewsWatchConfig = DEFAULT_NEWS_WATCH_CONFIG;
  private running = false;

  // Distinct stock tickers held, with a normalized company name for matching
  // broad-market headlines back to a position.
  private async watchedSymbols(): Promise<Map<string, string>> {
    const holdingsModel = await HoldingsModel().initialize();
    const watched = new Map<string, string>();
    for (const holding of holdingsModel.getAllRecords()) {
      if (holding.type !== 'stock') continue;
      if (!watched.has(holding.symbol)) {
        watched.set(holding.symbol, normalizeCompanyName(holding.name));
      }
    }
    return watched;
  }

  private async holdingsNews(watched: Map<string, string>, since: moment.Moment): Promise<Candidate[]> {
    const from = since.clone().subtract(1, 'day').format('YYYY-MM-DD');
    const to = moment().format('YYYY-MM-DD');

    return mapWithConcurrency([...watched.keys()], SYMBOL_CONCURRENCY, async (symbol) => {
      try {
        const articles = await getCompanyNews(symbol, from, to);
        return articles.map((a) => ({
          symbol,
          headline: a.headline ?? '',
          summary: a.summary ?? '',
          source: a.source ?? 'Finnhub',
          url: a.url ?? '',
          publishedAt: a.datetime ? moment.unix(a.datetime).toISOString() : '',
        }));
      } catch (err: any) {
        logger.log({ level: 'error', label: LABEL, message: `Company news failed for ${symbol}: ${err.message}` });
        return [];
      }
    });
  }

  private async marketNews(watched: Map<string, string>): Promise<Candidate[]> {
    try {
      const headlines = await getTopBusinessHeadlines(25);
      return headlines.map((a) => ({
        symbol: relatedSymbol(a.headline, watched),
        headline: a.headline,
        summary: a.summary,
        source: a.source,
        url: a.url,
        publishedAt: a.publishedAt,
      }));
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: `Market headlines failed: ${err.message}` });
      return [];
    }
  }

  private async pruneSeen(): Promise<void> {
    try {
      const model = await SeenNewsDBModel().initialize();
      const cutoff = moment().subtract(SEEN_RETENTION_DAYS, 'days');
      const stale = model.getAllRecords().filter((rec) => moment(rec.seenAt).isBefore(cutoff));
      for (const rec of stale) await model.deleteById(rec.id);
      if (stale.length > 0) {
        logger.log({ level: 'info', label: LABEL, message: `Pruned ${stale.length} stale seen-news record(s)` });
      }
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: `Prune failed: ${err.message}` });
    }
  }

  private async recordSeen(key: string, candidate: Candidate): Promise<void> {
    const model = await SeenNewsDBModel().initialize();
    await model.insertOrUpdate(
      {
        symbol: candidate.symbol ?? '',
        headline: candidate.headline,
        url: candidate.url,
        seenAt: new Date().toISOString(),
      },
      key
    );
  }

  private async collect(config: INewsWatchConfig): Promise<Candidate[]> {
    const watched = await this.watchedSymbols();
    const since = moment().subtract(config.lookbackHours, 'hours');

    const collected: Candidate[] = [];
    if (config.watchHoldings && watched.size > 0) {
      collected.push(...(await this.holdingsNews(watched, since)));
    }
    if (config.watchMarket) {
      collected.push(...(await this.marketNews(watched)));
    }

    const byKey = new Map<string, Candidate>();
    for (const candidate of collected) {
      if (!candidate.headline) continue;
      if (!candidate.publishedAt || moment(candidate.publishedAt).isBefore(since)) continue;
      const key = articleKey(candidate.url, candidate.headline);
      // Company-news hits carry a ticker, so they win over an untagged
      // market-feed copy of the same story.
      const existing = byKey.get(key);
      if (!existing || (!existing.symbol && candidate.symbol)) byKey.set(key, candidate);
    }

    return [...byKey.values()].sort((a, b) => moment(b.publishedAt).valueOf() - moment(a.publishedAt).valueOf());
  }

  async runCheck(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      if (!mqttPublisher.isEnabled()) {
        logger.log({ level: 'warn', label: LABEL, message: 'Skipped run — MQTT is not enabled' });
        return;
      }

      const config = this.config;
      const candidates = await this.collect(config);
      const seenModel = await SeenNewsDBModel().initialize();
      const seen = new Set(seenModel.getAllRecords().map((rec) => rec.id));

      const fresh = candidates.filter((c) => !seen.has(articleKey(c.url, c.headline)));

      // First run records the current wire as the baseline instead of notifying
      // on a backlog the user has effectively already lived through.
      const seeded = (await getJobState(SEEDED_KEY)) === 'true';
      if (!seeded) {
        for (const candidate of fresh) {
          await this.recordSeen(articleKey(candidate.url, candidate.headline), candidate);
        }
        await setJobState(SEEDED_KEY, 'true');
        logger.log({ level: 'info', label: LABEL, message: `Seeded baseline with ${fresh.length} article(s)` });
        return;
      }

      const scored = fresh
        .map((candidate) => {
          const keywords = matchedPatterns(`${candidate.headline} ${candidate.summary}`);
          return { candidate, keywords, breaking: keywords.length > 0 };
        })
        .filter((entry) => !config.breakingOnly || entry.breaking);

      // A story about something you own outranks generic market coverage.
      const ranked = scored
        .sort((a, b) => {
          if (!!b.candidate.symbol !== !!a.candidate.symbol) return b.candidate.symbol ? 1 : -1;
          return b.keywords.length - a.keywords.length;
        })
        .slice(0, Math.max(1, config.maxPerRun));

      for (const { candidate, keywords, breaking } of ranked) {
        const payload = buildNewsAlertPayload({ ...candidate, breaking, matchedKeywords: keywords });
        const ok = await dispatchNewsAlert(payload, config.topic);
        // Record only on a successful publish, so a broker blip redelivers next
        // cycle rather than losing the headline. The lookback window bounds retries.
        if (ok) await this.recordSeen(articleKey(candidate.url, candidate.headline), candidate);
      }

      if (ranked.length > 0) {
        logger.log({ level: 'info', label: LABEL, message: `Published ${ranked.length} news alert(s)` });
      }

      await this.pruneSeen();
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: err.message });
    } finally {
      this.running = false;
    }
  }

  // Publish a sample headline immediately, bypassing the schedule, the seen-set
  // and the enabled gate, so the Settings page can offer a "Send now" test.
  async sendTest(): Promise<{ ok: boolean; mqttEnabled: boolean }> {
    const config = await getNewsWatchConfig();
    const payload = buildNewsAlertPayload({
      symbol: 'TEST',
      headline: 'Test Company beats earnings estimates and raises full-year guidance',
      summary: 'This is a test news notification from Portfolio Dashboard.',
      source: 'Portfolio Dashboard',
      url: 'https://example.com/test-article',
      publishedAt: new Date().toISOString(),
      breaking: true,
      matchedKeywords: ['earnings', 'guidance'],
    });
    const ok = await dispatchNewsAlert(payload, config.topic);
    return { ok, mqttEnabled: mqttPublisher.isEnabled() };
  }

  start(config: INewsWatchConfig): void {
    this.stop();
    this.config = config;
    if (!config.enabled) {
      logger.log({ level: 'info', label: LABEL, message: 'Disabled' });
      return;
    }

    // Deliberately not gated by the market calendar — news breaks overnight and
    // at weekends, which is exactly when you are not watching the screen.
    const intervalMs = Math.max(1, config.intervalMinutes) * 60 * 1000;
    void this.scheduler.start(intervalMs, () => this.runCheck());
    logger.log({
      level: 'info',
      label: LABEL,
      message: `Started — every ${config.intervalMinutes} min, holdings: ${config.watchHoldings}, market: ${config.watchMarket}, breaking only: ${config.breakingOnly}, max ${config.maxPerRun}/run → ${config.topic}`,
    });
  }

  stop(): void {
    this.scheduler.stop();
    logger.log({ level: 'info', label: LABEL, message: 'Stopped' });
  }

  reconfigure(config: INewsWatchConfig): void {
    this.start(config);
  }
}

export const newsWatchService = new NewsWatchService();
