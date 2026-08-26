import moment from 'moment';
import { getMarketStatus } from '../externalApis/finnHub';
import { CacheDBModel, ICacheModel } from '../models/CacheModel';
import { getMarketSession, getNextSessionChange, type MarketSession } from '../utils/marketCalendar';
import { logger } from '../utils/winston';

// US market open/closed/extended-hours status from Finnhub — public exchange
// data, no personal holdings and no AI provider involved.

export type { MarketSession };

export type MarketStatus = {
  isOpen: boolean;
  session: MarketSession;
  holiday: string | null;
  exchange: string;
  timezone: string;
  // When the current session gives way to the next one, so the UI can count down
  // to the opening bell rather than just asserting "closed".
  nextChange: { session: MarketSession; at: string };
  generatedAt: string;
};

const CACHE_KEY = 'market_status';
const CACHE_MINUTES = 1;
const LABEL = 'MarketStatus';

// Finnhub's free tier sometimes returns a null session, and only ever says
// "closed" for anything outside the regular bell — including pre-market, when
// prices are very much moving. Fall back to the local exchange calendar, which
// models pre-/post-market directly.
const normalizeSession = (session: string | null, isOpen: boolean): MarketSession => {
  const s = (session ?? '').toLowerCase();
  if (s.includes('pre')) return 'pre-market';
  if (s.includes('post') || s.includes('after')) return 'post-market';
  if (s === 'regular' || s === 'market' || isOpen) return 'regular';
  return getMarketSession();
};

// Calendar-only status, used when Finnhub is unreachable and nothing usable is
// cached. Better a locally-derived session than no market status at all.
const localStatus = (): MarketStatus => {
  const session = getMarketSession();
  return {
    isOpen: session === 'regular',
    session,
    holiday: null,
    exchange: 'US',
    timezone: 'America/New_York',
    nextChange: getNextSessionChange(),
    generatedAt: moment().toISOString(),
  };
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
      return { ...cachedStatus, nextChange: getNextSessionChange() };
    }

    try {
      const raw = await getMarketStatus('US');
      const status: MarketStatus = {
        isOpen: !!raw.isOpen,
        session: normalizeSession(raw.session, !!raw.isOpen),
        holiday: raw.holiday ?? null,
        exchange: raw.exchange || 'US',
        timezone: raw.timezone || 'America/New_York',
        nextChange: getNextSessionChange(),
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
        return { ...cachedStatus, nextChange: getNextSessionChange() };
      }
      logger.log({
        level: 'warn',
        label: LABEL,
        message: `Live refresh failed with no cache, serving calendar-derived status: ${err.message}`,
      });
      return localStatus();
    }
  };
}
