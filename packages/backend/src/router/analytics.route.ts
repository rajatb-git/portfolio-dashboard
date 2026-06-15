import Router from '@koa/router';

import { getPerformanceAttribution } from '../controller/PerformanceAttributionController';
import { calculateRiskMetrics } from '../controller/RiskAnalyticsController';
import { getSectorAllocation } from '../controller/SectorController';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

export const AnalyticsRouter = () => {
  const router = new Router();

  router.get('/analytics/risk', async (ctx) => {
    try {
      ctx.body = await calculateRiskMetrics();
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Risk analytics route' });
      ctx.body = errorBody('Failed to calculate risk metrics', error.message);
      ctx.status = 400;
    }
  });

  router.get('/analytics/sectors', async (ctx) => {
    try {
      ctx.body = await getSectorAllocation();
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Sector allocation route' });
      ctx.body = errorBody('Failed to get sector allocation', error.message);
      ctx.status = 400;
    }
  });

  router.get('/analytics/performance-attribution', async (ctx) => {
    try {
      ctx.body = await getPerformanceAttribution();
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Performance attribution route' });
      ctx.body = errorBody('Failed to get performance attribution', error.message);
      ctx.status = 400;
    }
  });

  return router;
};
