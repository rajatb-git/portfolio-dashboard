import { DEFAULT_MONGO_DB_NAME, getMongoDb } from '../utils/mongoClient';
import { logger } from '../utils/winston';
import { DATASETS, type DatasetName, type FreshnessContext, parseQuoteKey, type StoredEntry } from './datasets';
import { FinnhubBusyError, type Lane } from './finnhubClient';

// The one place market data is read from. A read never waits on Finnhub's
// budget unless it asks to, and then only up to a deadline:
//
//   cached  — whatever is stored, immediately. Missing or stale data is handed
//             to the scheduler, which fetches it as budget allows. For list
//             views and background jobs.
//   fresh   — stored data if it is reasonably recent, otherwise one fetch on
//             the user lane, waiting at most `waitMs` before settling for the
//             stored copy. For a page a user has open.
//   force   — a fetch that bypasses freshness, for an explicit refresh button.
//             Errors when it can't be done.
//
// Market data is public and the same whichever database is active, so it
// always lives in the real database — Demo Mode reuses it.

export type ReadMode = 'cached' | 'fresh' | 'force';

export type ReadOptions = {
  mode?: ReadMode;
  lane?: Lane;
  waitMs?: number;
  // Marks the symbol as open on the Research page, so the scheduler keeps it
  // fresh for a while and its quote moves at the viewed cadence.
  view?: boolean;
};

export type MarketRead<T> = {
  value: T | null;
  fetchedAt: string | null;
  fresh: boolean;
  // Nothing stored yet and the fetch hasn't failed outright: it is on its way.
  pending: boolean;
  error: string | null;
};

type Failure = { message: string; at: string; count: number; retryAt: number; busy: boolean };

const COLLECTION = 'market_data';
const DEFAULT_FRESH_WAIT_MS = 3000;
const FORCE_WAIT_MS = 10_000;
// A stored copy up to this many freshness windows old is still served to a
// `fresh` read without waiting — the scheduler normally replaces it first.
const FRESH_GRACE = 2;
const VIEW_TTL_MS = 15 * 60_000;
const RETENTION_MS = 30 * 24 * 60 * 60_000;
const BUSY_RETRY_MS = 5000;
const MAX_BACKOFF_MS = 60 * 60_000;

const entries = new Map<string, StoredEntry>();
const failures = new Map<string, Failure>();
const inFlight = new Map<string, Promise<StoredEntry>>();
const requested = new Map<string, { dataset: DatasetName; key: string }>();
const viewedAt = new Map<string, number>();
let quoteCount = 0;

export const entryId = (dataset: DatasetName, key: string): string => `${dataset}:${key}`;

const load = async (): Promise<void> => {
  const collection = (await getMongoDb(DEFAULT_MONGO_DB_NAME)).collection(COLLECTION);
  const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();
  await collection.deleteMany({ fetchedAt: { $lt: cutoff } });
  const docs = await collection.find({}).toArray();
  for (const doc of docs) {
    if (doc.dataset in DATASETS) entries.set(String(doc._id), { value: doc.value, fetchedAt: doc.fetchedAt });
  }
  logger.log({ level: 'info', label: 'MarketData', message: `Loaded ${entries.size} stored market data entries` });
};

let readyPromise: Promise<void> | null = null;

// Market data works from memory even if this load fails; it just starts cold.
export const marketDataReady = (): Promise<void> => {
  if (!readyPromise) {
    readyPromise = load().catch((err: any) => {
      logger.log({ level: 'error', label: 'MarketData', message: `Loading stored market data failed: ${err.message}` });
    });
  }
  return readyPromise;
};

const persist = (id: string, dataset: DatasetName, key: string, entry: StoredEntry): void => {
  getMongoDb(DEFAULT_MONGO_DB_NAME)
    .then((db) =>
      db
        .collection(COLLECTION)
        .replaceOne(
          { _id: id } as any,
          { _id: id, dataset, key, value: entry.value, fetchedAt: entry.fetchedAt },
          { upsert: true }
        )
    )
    .catch((err: any) => {
      logger.log({ level: 'error', label: 'MarketData', message: `Persisting ${id} failed: ${err.message}` });
    });
};

export const setQuoteCount = (count: number): void => {
  quoteCount = count;
};

const symbolOf = (dataset: DatasetName, key: string): string => (dataset === 'quote' ? parseQuoteKey(key).symbol : key);

const isViewed = (symbol: string): boolean => {
  const at = viewedAt.get(symbol);
  return at !== undefined && Date.now() - at < VIEW_TTL_MS;
};

export const viewedSymbols = (): string[] => {
  const now = Date.now();
  const out: string[] = [];
  for (const [symbol, at] of viewedAt) {
    if (now - at < VIEW_TTL_MS) out.push(symbol);
    else viewedAt.delete(symbol);
  }
  return out;
};

const freshnessContext = (dataset: DatasetName, key: string): FreshnessContext => ({
  viewed: isViewed(symbolOf(dataset, key)),
  quoteCount,
});

export const freshForMs = (dataset: DatasetName, key: string): number =>
  DATASETS[dataset].freshForMs(key, entries.get(entryId(dataset, key)), freshnessContext(dataset, key));

export const ageOf = (entry: StoredEntry): number => Date.now() - new Date(entry.fetchedAt).getTime();

export const peek = (dataset: DatasetName, key: string) => {
  const id = entryId(dataset, key);
  return { entry: entries.get(id), failure: failures.get(id), inFlight: inFlight.has(id) };
};

export const takeRequested = (): Array<{ dataset: DatasetName; key: string }> => [...requested.values()];

const recordFailure = (id: string, err: any): void => {
  const busy = err instanceof FinnhubBusyError;
  const previous = failures.get(id);
  const count = busy ? (previous?.count ?? 0) : (previous?.count ?? 0) + 1;
  const backoff = busy ? BUSY_RETRY_MS : Math.min(MAX_BACKOFF_MS, 30_000 * 2 ** (count - 1));
  failures.set(id, {
    message: err?.message ?? String(err),
    at: new Date().toISOString(),
    count,
    retryAt: Date.now() + backoff,
    busy,
  });
};

// Fetches and stores one entry. Concurrent refreshes of the same entry share
// one fetch, whichever lane asked first.
export const refresh = (
  dataset: DatasetName,
  key: string,
  options: { lane: Lane; waitMs: number }
): Promise<StoredEntry> => {
  const id = entryId(dataset, key);
  const existing = inFlight.get(id);
  if (existing) return existing;

  const promise = DATASETS[dataset]
    .fetch(key, options, entries.get(id))
    .then((value) => {
      const entry: StoredEntry = { value, fetchedAt: new Date().toISOString() };
      entries.set(id, entry);
      failures.delete(id);
      requested.delete(id);
      persist(id, dataset, key, entry);
      return entry;
    })
    .catch((err) => {
      recordFailure(id, err);
      if (!(err instanceof FinnhubBusyError)) requested.delete(id);
      throw err;
    })
    .finally(() => {
      inFlight.delete(id);
    });

  inFlight.set(id, promise);
  return promise;
};

const snapshot = <T>(dataset: DatasetName, key: string): MarketRead<T> => {
  const id = entryId(dataset, key);
  const entry = entries.get(id);
  const failure = failures.get(id);
  return {
    value: (entry?.value ?? null) as T | null,
    fetchedAt: entry?.fetchedAt ?? null,
    fresh: !!entry && ageOf(entry) < freshForMs(dataset, key),
    pending: !entry && (!failure || failure.busy),
    error: failure && !failure.busy ? failure.message : null,
  };
};

const withDeadline = <T>(promise: Promise<T>, ms: number): Promise<T | null> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(resolve, () => resolve(null)).finally(() => clearTimeout(timer));
  });

export const read = async <T = any>(
  dataset: DatasetName,
  key: string,
  options: ReadOptions = {}
): Promise<MarketRead<T>> => {
  await marketDataReady();
  const mode = options.mode ?? 'cached';
  const id = entryId(dataset, key);
  if (options.view) viewedAt.set(symbolOf(dataset, key), Date.now());

  if (mode === 'force') {
    const waitMs = options.waitMs ?? FORCE_WAIT_MS;
    try {
      await refresh(dataset, key, { lane: options.lane ?? 'user', waitMs });
    } catch (err: any) {
      if (err instanceof FinnhubBusyError) {
        throw new Error('Market data provider is at its rate limit — try again in a minute');
      }
      throw err;
    }
    return snapshot<T>(dataset, key);
  }

  const entry = entries.get(id);
  const freshFor = freshForMs(dataset, key);
  const age = entry ? ageOf(entry) : Number.POSITIVE_INFINITY;

  if (age < freshFor) return snapshot<T>(dataset, key);

  if (mode === 'fresh' && age >= freshFor * FRESH_GRACE) {
    const waitMs = options.waitMs ?? DEFAULT_FRESH_WAIT_MS;
    const failure = failures.get(id);
    // Don't hammer something that just failed for real; serve what there is.
    if (!failure || failure.busy || failure.retryAt <= Date.now()) {
      await withDeadline(refresh(dataset, key, { lane: options.lane ?? 'user', waitMs }), waitMs);
    }
    return snapshot<T>(dataset, key);
  }

  requested.set(id, { dataset, key });
  return snapshot<T>(dataset, key);
};

export const storeStats = () => {
  const byDataset: Record<string, number> = {};
  for (const id of entries.keys()) {
    const dataset = id.slice(0, id.indexOf(':'));
    byDataset[dataset] = (byDataset[dataset] ?? 0) + 1;
  }
  const failing = [...failures.entries()]
    .filter(([, f]) => !f.busy)
    .map(([id, f]) => ({ id, message: f.message, count: f.count, at: f.at }));
  return {
    entries: byDataset,
    inFlight: inFlight.size,
    requested: requested.size,
    viewed: viewedSymbols(),
    failing,
  };
};
