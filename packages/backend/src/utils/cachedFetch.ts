import moment from 'moment';
import { CacheDBModel } from '../models/CacheModel';
import { logger } from './winston';

// Serve-from-cache-then-revalidate, the same contract LiveQuoteController applies
// to quotes, generalised so the research endpoints can use it too. A cached value
// is returned immediately and refreshed in the background once it ages past the
// TTL, so a page renders what it already has instead of a skeleton while a
// rate-limited upstream call waits its turn. Only a cold key blocks.

const LABEL = 'Cache';

// Dedupes concurrent refreshes for the same key across per-request controllers.
const inFlight = new Map<string, Promise<any>>();

// Values are wrapped so a legitimately null payload (a ticker with no earnings
// date, say) is still a cache hit rather than looking like a miss forever.
type Envelope<T> = { v: T };

const refresh = async <T>(key: string, fetcher: () => Promise<T>): Promise<T> => {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = (async () => {
    const value = await fetcher();
    const model = await CacheDBModel().initialize();
    const envelope: Envelope<T> = { v: value };
    await model.insertOrUpdate({ key, value: JSON.stringify(envelope) }, key);
    return value;
  })().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, promise);
  return promise;
};

export async function cachedFetch<T>(key: string, ttlMinutes: number, fetcher: () => Promise<T>): Promise<T> {
  const model = await CacheDBModel().initialize();
  const cached = model.findById(key);

  if (cached) {
    try {
      const { v } = JSON.parse(cached.value) as Envelope<T>;
      if (moment().diff(moment(cached.updatedAt), 'minutes') >= ttlMinutes) {
        void refresh(key, fetcher).catch((err: any) => {
          logger.log({ level: 'warn', label: LABEL, message: `Background refresh failed for ${key}: ${err.message}` });
        });
      }
      return v;
    } catch {
      // Corrupt entry — fall through and refetch.
    }
  }

  return refresh(key, fetcher);
}
