import Router from '@koa/router';

import { calculateCorrelation } from '../controller/CorrelationController';
import { getHoldingsEarningsCalendar } from '../controller/HoldingsEarningsController';
import { calculateMonthlyReturns } from '../controller/MonthlyReturnsController';
import { getPerformanceAttribution } from '../controller/PerformanceAttributionController';
import { generatePortfolioInsights } from '../controller/PortfolioInsightsController';
import { getGoalProgress } from '../controller/PortfolioGoalController';
import { calculateRealizedGains } from '../controller/RealizedGainsController';
import { calculateRiskMetrics } from '../controller/RiskAnalyticsController';
import { getSectorAllocation } from '../controller/SectorController';
import { findTaxLossHarvesting } from '../controller/TaxLossHarvestingController';
import {
  DEFAULT_PORTFOLIO_GOAL_CONFIG,
  getPortfolioGoalConfig,
  savePortfolioGoalConfig,
} from '../models/PortfolioGoalConfigModel';
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

  router.get('/analytics/realized-gains', async (ctx) => {
    try {
      ctx.body = await calculateRealizedGains();
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Realized gains route' });
      ctx.body = errorBody('Failed to calculate realized gains', error.message);
      ctx.status = 400;
    }
  });

  router.get('/analytics/earnings-calendar', async (ctx) => {
    try {
      ctx.body = await getHoldingsEarningsCalendar();
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Holdings earnings calendar route' });
      ctx.body = errorBody('Failed to get earnings calendar', error.message);
      ctx.status = 400;
    }
  });

  router.post('/analytics/portfolio-insights', async (ctx) => {
    try {
      ctx.body = await generatePortfolioInsights();
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Portfolio insights route' });
      ctx.body = errorBody('Failed to generate portfolio insights', error.message);
      ctx.status = 400;
    }
  });

  router.get('/analytics/tax-loss-harvesting', async (ctx) => {
    try {
      ctx.body = await findTaxLossHarvesting();
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Tax-loss harvesting route' });
      ctx.body = errorBody('Failed to find tax-loss harvesting opportunities', error.message);
      ctx.status = 400;
    }
  });

  router.get('/analytics/monthly-returns', async (ctx) => {
    try {
      ctx.body = await calculateMonthlyReturns();
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Monthly returns route' });
      ctx.body = errorBody('Failed to calculate monthly returns', error.message);
      ctx.status = 400;
    }
  });

  router.get('/analytics/correlation', async (ctx) => {
    try {
      ctx.body = await calculateCorrelation();
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Correlation route' });
      ctx.body = errorBody('Failed to calculate correlation matrix', error.message);
      ctx.status = 400;
    }
  });

  router.get('/analytics/goal', async (ctx) => {
    try {
      ctx.body = await getGoalProgress();
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Goal progress route' });
      ctx.body = errorBody('Failed to get goal progress', error.message);
      ctx.status = 400;
    }
  });

  router.get('/analytics/goal/config', async (ctx) => {
    try {
      ctx.body = await getPortfolioGoalConfig();
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Goal config route' });
      ctx.body = errorBody('Failed to get goal config', error.message);
      ctx.status = 400;
    }
  });

  router.post('/analytics/goal/config', async (ctx) => {
    try {
      const body = (ctx.request.body ?? {}) as Partial<typeof DEFAULT_PORTFOLIO_GOAL_CONFIG>;
      const targetValue = Number(body.targetValue);
      if (!Number.isFinite(targetValue) || targetValue < 0) {
        ctx.body = errorBody('Invalid goal', 'Target value must be a non-negative number');
        ctx.status = 400;
        return;
      }
      ctx.body = await savePortfolioGoalConfig({
        label: (body.label || DEFAULT_PORTFOLIO_GOAL_CONFIG.label).trim(),
        targetValue: +targetValue.toFixed(2),
        targetDate: body.targetDate || null,
      });
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Save goal config route' });
      ctx.body = errorBody('Failed to save goal config', error.message);
      ctx.status = 400;
    }
  });

  return router;
};
