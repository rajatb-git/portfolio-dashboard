import moment from 'moment';
import { getMarketStatus } from '../externalApis/finnHub';
import { CacheDBModel, ICacheModel } from '../models/CacheModel';
import { logger } from '../utils/winston';

// US market open/closed/extended-hours status from Finnhub — public exchange
// data, no personal holdings and no AI provider involved.

export type MarketSession = 'pre-market' | 'regular' | 'post-market' | 'closed';

export type MarketStatus = {
  isOpen: boolean;
  session: MarketSession;
  holiday: string | null;
  exchange: string;
  timezone: string;
  generatedAt: string;
};

const CACHE_KEY = 'market_status';
const CACHE_MINUTES = 1;
const LABEL = 'MarketStatus';

const normalizeSession = (session: string | null, isOpen: boolean): MarketSession => {
  const s = (session ?? '').toLowerCase();
  if (s.includes('pre')) return 'pre-market';
  if (s.includes('post') || s.includes('after')) return 'post-market';
  if (s === 'regular' || s === 'market' || isOpen) return 'regular';
  return 'closed';
};

const parseCached = (cached: ICacheModel | undefined): MarketStatus | null => {
  if (!cached) return null;
  try {
    return JSON.parse(cached.value);
  } catch {
    return null;
  }
};

export class MarketStatusController {
  getStatus = async (forceRefresh = false): Promise<MarketStatus> => {
    const cacheModel = await CacheDBModel().initialize();
    const cached = cacheModel.findById(CACHE_KEY);
    const cachedStatus = parseCached(cached);
    const isFresh = !!cached && moment().diff(moment(cached.updatedAt), 'minutes') < CACHE_MINUTES;

    if (!forceRefresh && cachedStatus && isFresh) {
      return cachedStatus;
    }

    try {
      const raw = await getMarketStatus('US');
      const status: MarketStatus = {
        isOpen: !!raw.isOpen,
        session: normalizeSession(raw.session, !!raw.isOpen),
        holiday: raw.holiday ?? null,
        exchange: raw.exchange || 'US',
        timezone: raw.timezone || 'America/New_York',
        generatedAt: moment().toISOString(),
      };

      await cacheModel.insertOrUpdate({ key: CACHE_KEY, value: JSON.stringify(status) }, CACHE_KEY);
      logger.log({ level: 'info', label: LABEL, message: `Market ${status.session} (open=${status.isOpen})` });

      return status;
    } catch (err: any) {
      // Finnhub call failed (rate limit, timeout, outage) — serve the last known-good
      // status instead of failing the request, same as LiveQuoteController/
      // LiveRecommendationController. MarketStatusService keeps this cache warm on its
      // own schedule, so a usable value is almost always here even if slightly stale.
      if (cachedStatus) {
        logger.log({
          level: 'warn',
          label: LABEL,
          message: `Live refresh failed, serving cached status: ${err.message}`,
        });
        return cachedStatus;
      }
      throw err;
    }
  };
}
