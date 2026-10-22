import Router from '@koa/router';

import { finnhubStats } from '../marketData/finnhubClient';
import { schedulerStats } from '../marketData/scheduler';
import { storeStats } from '../marketData/store';
import { errorBody } from '../utils/error';
import { getMongoDb } from '../utils/mongoClient';
import { logger } from '../utils/winston';

export const HealthRouter = () => {
  const router = new Router();

  router.get('/health', async (ctx) => {
    try {
      const db = await getMongoDb();
      await db.command({ ping: 1 });
      ctx.body = { status: 'ok', mongo: 'connected' };
      ctx.status = 200;
    } catch (err: any) {
      ctx.body = { status: 'degraded', mongo: 'disconnected', error: err.message };
      ctx.status = 503;
    }
  });

  // How the Finnhub budget is being spent and how fresh the stored market data
  // is — the first place to look when pages feel slow or quotes look stale.
  router.get('/health/market-data', async (ctx) => {
    try {
      ctx.body = { finnhub: finnhubStats(), scheduler: schedulerStats(), store: storeStats() };
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Market data health' });
      ctx.body = errorBody('Failed to read market data health', err.message);
      ctx.status = 500;
    }
  });

  return router;
};
