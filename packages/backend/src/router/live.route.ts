import Router from '@koa/router';
import moment from 'moment';
import { AgentInsightsController } from '../controller/AgentInsightsController';
import { CompanyProfileController } from '../controller/CompanyProfileController';
import { IPOController } from '../controller/IPOController';
import { IPOInsightsController } from '../controller/IPOInsightsController';
import { LiveQuoteController } from '../controller/LiveQuoteController';
import { LiveRecommendationController } from '../controller/LiveRecommendationController';
import { MarketNewsController } from '../controller/MarketNewsController';
import { NewsSentimentController } from '../controller/NewsSentimentController';
import {
  getCompanyNews,
  getEarningsCalendar,
  getEarningsHistory,
  getInsiderTransactions,
  getStockMetrics,
  getStockPeers,
} from '../externalApis/finnHub';
import { getPriceHistoryCandleStick } from '../externalApis/nasdaq';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

export const LiveRouter = () => {
  const router = new Router();

  router.get('/live/quote/:sym', async (ctx) => {
    try {
      const result = await new LiveQuoteController().getLiveQuote(ctx.params.sym.toUpperCase());

      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get live quote "${ctx.params.sym}"` });
      ctx.body = errorBody('Failed to get live quote', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/recommendation/:sym', async (ctx) => {
    try {
      const result = await new LiveRecommendationController().getLiveRecommendation(ctx.params.sym.toUpperCase());

      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get live recommendation "${ctx.params.sym}"` });
      ctx.body = errorBody('Failed to get recommendation', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/news/:sym', async (ctx) => {
    try {
      const result = await getCompanyNews(
        ctx.params.sym.toUpperCase(),
        moment().subtract(3, 'days').format('YYYY-MM-DD'),
        moment().format('YYYY-MM-DD')
      );

      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get live company news "${ctx.params.sym}"` });
      ctx.body = errorBody('Failed to get news', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/history/:sym', async (ctx) => {
    try {
      if (!ctx.query.range) {
        ctx.body = errorBody('Missing parameter', 'range is required');
        ctx.status = 400;
        return;
      }
      const result = await getPriceHistoryCandleStick(ctx.params.sym.toUpperCase(), ctx.query.range as any);

      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get price history "${ctx.params.sym}"` });
      ctx.body = errorBody('Failed to get price history', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/ipos', async (ctx) => {
    try {
      const result = await new IPOController().getIPOs();

      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Get IPOs' });
      ctx.body = errorBody('Failed to get IPOs', err.message);
      ctx.status = 400;
    }
  });

  router.post('/live/ipo-insights', async (ctx) => {
    try {
      const result = await new IPOInsightsController().getInsights(ctx.request.body as any);

      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Get IPO insights' });
      ctx.body = errorBody('Failed to get IPO insights', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/company-profile/:sym', async (ctx) => {
    try {
      if (ctx.params.sym) {
        const result = await new CompanyProfileController().getCompanyProfile2(ctx.params.sym.toUpperCase());

        ctx.body = result;
        ctx.status = 200;
        return;
      }
      ctx.status = 400;
      ctx.body = errorBody('Symbol is required', 'Symbol is required');
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get company profile "${ctx.params.sym}"` });
      ctx.status = 500;
      ctx.body = errorBody('Failed to get company profile', err.message);
    }
  });

  router.get('/live/metrics/:sym', async (ctx) => {
    try {
      const result = await getStockMetrics(ctx.params.sym.toUpperCase());
      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get stock metrics "${ctx.params.sym}"` });
      ctx.body = errorBody('Failed to get stock metrics', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/peers/:sym', async (ctx) => {
    try {
      const result = await getStockPeers(ctx.params.sym.toUpperCase());
      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get stock peers "${ctx.params.sym}"` });
      ctx.body = errorBody('Failed to get stock peers', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/earnings/:sym', async (ctx) => {
    try {
      const result = await getEarningsCalendar(ctx.params.sym.toUpperCase());
      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get earnings calendar "${ctx.params.sym}"` });
      ctx.body = errorBody('Failed to get earnings', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/earnings-history/:sym', async (ctx) => {
    try {
      const result = await getEarningsHistory(ctx.params.sym.toUpperCase());
      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get earnings history "${ctx.params.sym}"` });
      ctx.body = errorBody('Failed to get earnings history', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/insider/:sym', async (ctx) => {
    try {
      const result = await getInsiderTransactions(ctx.params.sym.toUpperCase());
      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get insider transactions "${ctx.params.sym}"` });
      ctx.body = errorBody('Failed to get insider transactions', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/agent-insights/:sym', async (ctx) => {
    try {
      const result = await new AgentInsightsController().getInsights(ctx.params.sym.toUpperCase());
      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get agent insights "${ctx.params.sym}"` });
      ctx.body = errorBody('Failed to get agent insights', err.message);
      ctx.status = 400;
    }
  });


  router.get('/live/market-news', async (ctx) => {
    try {
      const forceRefresh = ctx.query.refresh === '1' || ctx.query.refresh === 'true';
      const result = await new MarketNewsController().getTopNews(forceRefresh);
      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Get market news' });
      ctx.body = errorBody('Failed to get market news', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/portfolio-sentiment', async (ctx) => {
    try {
      const result = await new NewsSentimentController().getSentiment();
      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Portfolio sentiment' });
      ctx.body = errorBody('Failed to get portfolio sentiment', err.message);
      ctx.status = 400;
    }
  });

  return router;
};
