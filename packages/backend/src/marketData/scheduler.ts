import { conditionOf } from '../controller/AlertConditions';
import { MARKET_INDICES } from '../controller/DailyRecapController';
import { getAiConfig } from '../models/AiConfigModel';
import { AlertModel } from '../models/AlertModel';
import { HoldingsModel } from '../models/HoldingsModel';
import { logger } from '../utils/winston';
import { DATASETS, type DatasetName, quoteKey, STOCK_DATASETS } from './datasets';
import { backgroundHeadroom } from './finnhubClient';
import {
  ageOf,
  entryId,
  freshForMs,
  marketDataReady,
  peek,
  refresh,
  setQuoteCount,
  takeRequested,
  viewedSymbols,
} from './store';

// Keeps the data someone needs inside its freshness window, spending only the
// Finnhub budget the user lane isn't using. It pulls work when there is
// capacity rather than pushing it into a queue, so background load can never
// pile up ahead of a page the user has open.
//
// "Someone needs" is: every held symbol (quote, plus everything the Research
// page shows, so opening a holding there never waits), alert symbols, whatever
// is open on Research, the index quotes the Today page and recap jobs use, and
// any read that found nothing stored.

const LABEL = 'MarketDataScheduler';
const TICK_MS = 500;
const REBUILD_MS = 30_000;
const NASDAQ_CONCURRENCY = 3;
const AI_PEERS_PER_SYMBOL = 5;

type Interest = { dataset: DatasetName; key: string };

let interests: Interest[] = [];
let nasdaqInFlight = 0;

const buildInterests = async (): Promise<Interest[]> => {
  const out = new Map<string, Interest>();
  const want = (dataset: DatasetName, key: string) => out.set(entryId(dataset, key), { dataset, key });

  const [holdings, alerts, aiConfig] = await Promise.all([
    HoldingsModel()
      .initialize()
      .then((m) => m.getAllRecords()),
    AlertModel()
      .initialize()
      .then((m) => m.getAllRecords()),
    getAiConfig(),
  ]);

  const stocks = new Set<string>();
  const cryptos = new Set<string>();
  for (const h of holdings) {
    if (!h.symbol) continue;
    if (h.type === 'crypto') {
      cryptos.add(h.symbol.toUpperCase());
      want('quote', quoteKey(h.symbol, true));
    } else stocks.add(h.symbol.toUpperCase());
  }
  for (const symbol of viewedSymbols()) if (!cryptos.has(symbol)) stocks.add(symbol);

  for (const symbol of stocks) for (const dataset of STOCK_DATASETS) want(dataset, symbol);

  if (holdings.length) for (const { symbol } of MARKET_INDICES) want('quote', symbol);

  for (const alert of alerts) {
    if (!alert.symbol) continue;
    want('quote', quoteKey(alert.symbol, alert.type === 'crypto'));
    if (alert.type !== 'crypto' && conditionOf(alert) === 'pct_from_high') want('metrics', alert.symbol.toUpperCase());
  }

  // AI insights compare against peer averages; keep those warm too so
  // generating an analysis doesn't wait on five more lookups.
  if (aiConfig.enabled) {
    for (const symbol of stocks) {
      const peers: string[] = peek('peers', symbol).entry?.value ?? [];
      for (const peer of peers.filter((p) => p && p.toUpperCase() !== symbol).slice(0, AI_PEERS_PER_SYMBOL)) {
        want('metrics', peer.toUpperCase());
      }
    }
  }

  want('marketStatus', 'US');
  return [...out.values()];
};

const rebuild = async (): Promise<void> => {
  try {
    interests = await buildInterests();
    setQuoteCount(interests.filter((i) => i.dataset === 'quote').length);
  } catch (err: any) {
    logger.log({ level: 'error', label: LABEL, message: `Rebuilding interests failed: ${err.message}` });
  }
};

type Candidate = Interest & { missing: boolean; overdue: number; rank: number };

const candidates = (): Candidate[] => {
  const now = Date.now();
  const seen = new Set<string>();
  const out: Candidate[] = [];

  for (const interest of [...takeRequested(), ...interests]) {
    const id = entryId(interest.dataset, interest.key);
    if (seen.has(id)) continue;
    seen.add(id);

    const { entry, failure, inFlight } = peek(interest.dataset, interest.key);
    if (inFlight || (failure && failure.retryAt > now)) continue;

    const freshFor = freshForMs(interest.dataset, interest.key);
    const age = entry ? ageOf(entry) : Number.POSITIVE_INFINITY;
    if (age < freshFor) continue;

    out.push({
      ...interest,
      missing: !entry,
      overdue: entry && freshFor > 0 ? age / freshFor : Number.POSITIVE_INFINITY,
      rank: DATASETS[interest.dataset].rank,
    });
  }

  // The dataset's own priority first, so quotes are never held back by a
  // backlog of slower-moving data (warming every Research card for a large
  // portfolio takes minutes); then nothing stored beats stale; then whatever
  // is furthest past its window.
  return out.sort((a, b) => a.rank - b.rank || Number(b.missing) - Number(a.missing) || b.overdue - a.overdue);
};

const tick = (): void => {
  let finnhubSlots = backgroundHeadroom();

  for (const candidate of candidates()) {
    const source = DATASETS[candidate.dataset].source(candidate.key, peek(candidate.dataset, candidate.key).entry);

    if (source === 'nasdaq') {
      if (nasdaqInFlight >= NASDAQ_CONCURRENCY) continue;
      nasdaqInFlight++;
      refresh(candidate.dataset, candidate.key, { lane: 'background', waitMs: 0 })
        .catch(() => {})
        .finally(() => {
          nasdaqInFlight--;
        });
      continue;
    }

    if (finnhubSlots <= 0) continue;
    finnhubSlots--;
    refresh(candidate.dataset, candidate.key, { lane: 'background', waitMs: 0 }).catch(() => {});
  }
};

export const startMarketDataScheduler = async (): Promise<void> => {
  await marketDataReady();
  await rebuild();
  setInterval(tick, TICK_MS);
  setInterval(() => void rebuild(), REBUILD_MS);
  logger.log({ level: 'info', label: LABEL, message: `Started — ${interests.length} entries watched` });
};

export const schedulerStats = () => {
  const now = Date.now();
  let stale = 0;
  let missing = 0;
  let oldestQuoteAgeSec = 0;
  for (const interest of interests) {
    const { entry } = peek(interest.dataset, interest.key);
    if (!entry) {
      missing++;
      continue;
    }
    const age = ageOf(entry);
    if (age >= freshForMs(interest.dataset, interest.key)) stale++;
    if (interest.dataset === 'quote') oldestQuoteAgeSec = Math.max(oldestQuoteAgeSec, Math.round(age / 1000));
  }
  const quoteInterest = interests.find((i) => i.dataset === 'quote' && !i.key.startsWith('crypto:'));
  return {
    watched: interests.length,
    missing,
    stale,
    oldestQuoteAgeSec,
    quoteRefreshSec: quoteInterest ? Math.round(freshForMs('quote', quoteInterest.key) / 1000) : null,
    nasdaqInFlight,
    at: new Date(now).toISOString(),
  };
};
