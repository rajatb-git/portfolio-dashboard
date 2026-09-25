import Router from '@koa/router';

import { getRebalancePlan } from '../controller/RebalanceController';
import { getRebalanceTargetConfig, saveRebalanceTargetConfig } from '../models/RebalanceTargetConfigModel';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

export const RebalanceRouter = () => {
  const router = new Router();

  router.get('/rebalance/plan', async (ctx) => {
    try {
      ctx.body = await getRebalancePlan();
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Rebalance plan route' });
      ctx.body = errorBody('Failed to build rebalance plan', error.message);
      ctx.status = 400;
    }
  });

  router.get('/rebalance/targets', async (ctx) => {
    try {
      ctx.body = await getRebalanceTargetConfig();
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Rebalance targets route' });
      ctx.body = errorBody('Failed to get rebalance targets', error.message);
      ctx.status = 400;
    }
  });

  router.post('/rebalance/targets', async (ctx) => {
    try {
      const body = (ctx.request.body ?? {}) as { targets?: unknown };
      if (!Array.isArray(body.targets)) {
        ctx.body = errorBody('Invalid targets', 'targets must be an array');
        ctx.status = 400;
        return;
      }
      const incoming = body.targets as Array<{ symbol?: unknown; targetPercent?: unknown }>;
      const seen = new Set<string>();
      for (const t of incoming) {
        const symbol = typeof t?.symbol === 'string' ? t.symbol.trim().toUpperCase() : '';
        const percent = Number(t?.targetPercent);
        if (!symbol || !Number.isFinite(percent) || percent < 0 || percent > 100) {
          ctx.body = errorBody('Invalid targets', 'Each target needs a symbol and a percent between 0 and 100');
          ctx.status = 400;
          return;
        }
        if (seen.has(symbol)) {
          ctx.body = errorBody('Invalid targets', `Duplicate target for ${symbol}`);
          ctx.status = 400;
          return;
        }
        seen.add(symbol);
      }
      // The page only sends symbols in today's plan; keep saved targets for any holding that
      // dropped out of it (e.g. an unpriced quote) instead of wiping them.
      const existing = await getRebalanceTargetConfig();
      const kept = existing.targets.filter((t) => !seen.has(t.symbol));
      ctx.body = await saveRebalanceTargetConfig({ targets: [...kept, ...(incoming as any)] });
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Save rebalance targets route' });
      ctx.body = errorBody('Failed to save rebalance targets', error.message);
      ctx.status = 400;
    }
  });

  return router;
};
