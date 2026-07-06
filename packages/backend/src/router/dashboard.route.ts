import Router from '@koa/router';
import { buildDailyRecap } from '../controller/DailyRecapController';
import { createDashboard } from '../controller/DashboardController';
import { PortfolioSnapshotDBModel } from '../models/PortfolioSnapshotModel';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

export const DashboardRouter = () => {
  const router = new Router();

  router.get('/dashboard/daily-recap', async (ctx) => {
    try {
      ctx.body = await buildDailyRecap();
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Daily recap route' });
      ctx.body = errorBody('Failed to build daily recap', err.message);
      ctx.status = 400;
    }
  });

  router.get('/dashboard', async (ctx) => {
    try {
      const result = await createDashboard();

      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.toString() + err.stack, label: 'Dashboard get route' });

      ctx.body = { name: 'Failed to generate dashboard', message: err.message };
      ctx.status = 400;
    }
  });

  router.get('/portfolio/snapshots', async (ctx) => {
    try {
      const snapshotModel = await PortfolioSnapshotDBModel().initialize();
      const all = snapshotModel.getAllRecords();
      const sorted = [...all].sort((a, b) => (a.timestamp ?? a.date).localeCompare(b.timestamp ?? b.date));
      ctx.body = sorted;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Portfolio snapshots route' });
      ctx.body = errorBody('Failed to get portfolio snapshots', err.message);
      ctx.status = 400;
    }
  });

  return router;
};
