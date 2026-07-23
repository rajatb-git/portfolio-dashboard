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
      ctx.body = await saveRebalanceTargetConfig({ targets: body.targets as any });
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Save rebalance targets route' });
      ctx.body = errorBody('Failed to save rebalance targets', error.message);
      ctx.status = 400;
    }
  });

  return router;
};
