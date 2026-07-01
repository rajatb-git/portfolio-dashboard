import moment from 'moment';
import { getMarketMovers, type NasdaqMover } from '../externalApis/nasdaq';
import { CacheDBModel } from '../models/CacheModel';
import { logger } from '../utils/winston';

// Whole-market top gainers/losers from NASDAQ — public market data, no personal
// holdings and no AI provider involved.

export type MarketMover = NasdaqMover;

export type MarketMoversDigest = {
  gainers: MarketMover[];
  losers: MarketMover[];
  generatedAt: string;
};

const CACHE_KEY = 'market_movers';
const CACHE_MINUTES = 10;
const LABEL = 'MarketMovers';

export class MarketMoversController {
  getMovers = async (forceRefresh = false): Promise<MarketMoversDigest> => {
    const cacheModel = await CacheDBModel().initialize();
    const cached = cacheModel.findById(CACHE_KEY);

    if (!forceRefresh && cached && moment().diff(moment(cached.updatedAt), 'minutes') < CACHE_MINUTES) {
      try {
        return JSON.parse(cached.value);
      } catch {
        // stale/corrupt cache, refetch
      }
    }

    const { gainers, losers } = await getMarketMovers();
    if (gainers.length === 0 && losers.length === 0) {
      throw new Error('No market movers available from the data source right now');
    }

    const digest: MarketMoversDigest = { gainers, losers, generatedAt: moment().toISOString() };
    await cacheModel.insertOrUpdate({ key: CACHE_KEY, value: JSON.stringify(digest) }, CACHE_KEY);
    logger.log({ level: 'info', label: LABEL, message: `Fetched ${gainers.length} gainers / ${losers.length} losers` });

    return digest;
  };
}
