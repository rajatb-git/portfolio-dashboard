import KoaRouter from 'koa-router';

import { logger } from '../utils/winston';
import { createDashboard } from '../controller/DashboardController';
import { PortfolioSnapshotDBModel } from '../models/PortfolioSnapshotModel';

export const DashboardRouter = () => {
  const router = new KoaRouter();

  router.get('/dashboard', async (ctx) => {
    try {
      const result = await createDashboard();

      ctx.body = result;
      ctx.status = 200;
    } catch (err) {
      logger.log({ level: 'error', message: err.toString() + err.stack, label: 'Dashboard get route' });

      ctx.body = { name: 'Failed to generate dashboard', message: err.message };
      ctx.status = 400;
    }
  });

  router.get('/portfolio/snapshots', async (ctx) => {
    try {
      const snapshotModel = await PortfolioSnapshotDBModel().initialize();
      const all = snapshotModel.getAllRecords();
      const sorted = [...all].sort((a, b) => a.date.localeCompare(b.date));
      ctx.body = sorted;
      ctx.status = 200;
    } catch (err) {
      logger.log({ level: 'error', message: err.message, label: 'Portfolio snapshots route' });
      ctx.body = err.message;
      ctx.status = 400;
    }
  });

  return router;
};
