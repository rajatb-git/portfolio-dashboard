import moment from 'moment';
import { getMarketStatus } from '../externalApis/finnHub';
import { CacheDBModel } from '../models/CacheModel';
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

export class MarketStatusController {
  getStatus = async (forceRefresh = false): Promise<MarketStatus> => {
    const cacheModel = await CacheDBModel().initialize();
    const cached = cacheModel.findById(CACHE_KEY);

    if (!forceRefresh && cached && moment().diff(moment(cached.updatedAt), 'minutes') < CACHE_MINUTES) {
      try {
        return JSON.parse(cached.value);
      } catch {
        // stale/corrupt cache, refetch
      }
    }

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
  };
}
