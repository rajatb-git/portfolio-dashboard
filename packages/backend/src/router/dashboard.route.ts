import Router from '@koa/router';
import { buildPortfolioBrief } from '../controller/BriefController';
import { buildDailyRecap } from '../controller/DailyRecapController';
import { createDashboard } from '../controller/DashboardController';
import { getDailyPerformance } from '../controller/PortfolioPerformanceController';
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

  router.get('/dashboard/brief', async (ctx) => {
    try {
      ctx.body = await buildPortfolioBrief();
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Portfolio brief route' });
      ctx.body = errorBody('Failed to build brief', error.message);
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

  router.get('/portfolio/performance', async (ctx) => {
    try {
      ctx.body = await getDailyPerformance();
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Portfolio performance route' });
      ctx.body = errorBody('Failed to get portfolio performance', err.message);
      ctx.status = 500;
    }
  });

  return router;
};
