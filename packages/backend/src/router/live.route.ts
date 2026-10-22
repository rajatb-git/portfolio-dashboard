import Router from '@koa/router';
import type { Context } from 'koa';
import moment from 'moment';
import { AgentInsightsController } from '../controller/AgentInsightsController';
import { IPOController } from '../controller/IPOController';
import { IPOInsightsController } from '../controller/IPOInsightsController';
import { MarketMoversController } from '../controller/MarketMoversController';
import { MarketNewsController } from '../controller/MarketNewsController';
import { MarketStatusController } from '../controller/MarketStatusController';
import { NewsSentimentController } from '../controller/NewsSentimentController';
import { ResearchController } from '../controller/ResearchController';
import { WatchedIpoController } from '../controller/WatchedIpoController';
import { searchSymbols } from '../externalApis/finnHub';
import { getPriceHistoryCandleStick } from '../externalApis/nasdaq';
import type { MarketRead } from '../marketData/store';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

// `?refresh=1` marks a request the user explicitly triggered, which bypasses the
// serve-from-cache path and waits for live data.
const isForcedRefresh = (ctx: Context): boolean => ctx.query.refresh === '1' || ctx.query.refresh === 'true';

// 202 means the data is being fetched but wasn't ready within the store's
// deadline; the frontend client asks again shortly instead of showing "none".
const sendRead = <T>(ctx: Context, result: MarketRead<T>, label: string): void => {
  if (result.value === null && result.pending) {
    ctx.status = 202;
    ctx.body = { pending: true };
    return;
  }
  if (result.value === null && result.error) {
    logger.log({ level: 'error', message: result.error, label });
    ctx.status = 400;
    ctx.body = errorBody(`Failed to ${label.toLowerCase()}`, result.error);
    return;
  }
  ctx.status = 200;
  ctx.body = result.value;
};

const HISTORY_RANGES = ['1d', '5d', '1M', '3M', '6M', '1y', '2y', '3y'];

export const LiveRouter = () => {
  const router = new Router();
  const research = new ResearchController();

  router.get('/live/quote/:sym', async (ctx) => {
    try {
      sendRead(ctx, await research.getQuote(ctx.params.sym.toUpperCase(), isForcedRefresh(ctx)), 'Get live quote');
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get live quote "${ctx.params.sym}"` });
      ctx.body = errorBody('Failed to get live quote', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/recommendation/:sym', async (ctx) => {
    try {
      sendRead(
        ctx,
        await research.getRecommendation(ctx.params.sym.toUpperCase(), isForcedRefresh(ctx)),
        'Get recommendation'
      );
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get live recommendation "${ctx.params.sym}"` });
      ctx.body = errorBody('Failed to get recommendation', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/news/:sym', async (ctx) => {
    try {
      sendRead(ctx, await research.getNews(ctx.params.sym.toUpperCase(), isForcedRefresh(ctx)), 'Get news');
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get live company news "${ctx.params.sym}"` });
      ctx.body = errorBody('Failed to get news', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/history/:sym', async (ctx) => {
    try {
      if (!HISTORY_RANGES.includes(String(ctx.query.range))) {
        ctx.body = errorBody('Invalid parameter', `range must be one of ${HISTORY_RANGES.join(', ')}`);
        ctx.status = 400;
        return;
      }
      const symbol = String(ctx.params.sym || '').toUpperCase();
      if (!/^[A-Z0-9.-]{1,10}$/.test(symbol)) {
        ctx.body = errorBody('Invalid parameter', 'sym is invalid');
        ctx.status = 400;
        return;
      }
      const result = await getPriceHistoryCandleStick(symbol, ctx.query.range as any);

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

  const SYMBOL_RE = /^[A-Za-z0-9.\-^]{1,20}$/;

  router.put('/live/ipos/:symbol/watch', async (ctx) => {
    try {
      const symbol = ctx.params.symbol.toUpperCase();
      if (!SYMBOL_RE.test(symbol)) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid symbol', 'Symbol must be 1-20 alphanumeric characters');
        return;
      }
      const name = String((ctx.request.body as any)?.name ?? '').trim();
      const date = String((ctx.request.body as any)?.date ?? '').trim();
      if (!name || !date) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid request', '"name" and "date" are required');
        return;
      }

      ctx.body = await new WatchedIpoController().watch(symbol, name, date);
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Watch IPO' });
      ctx.body = errorBody('Failed to watch IPO', err.message);
      ctx.status = 400;
    }
  });

  router.delete('/live/ipos/:symbol/watch', async (ctx) => {
    try {
      const symbol = ctx.params.symbol.toUpperCase();
      if (!SYMBOL_RE.test(symbol)) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid symbol', 'Symbol must be 1-20 alphanumeric characters');
        return;
      }
      await new WatchedIpoController().unwatch(symbol);
      ctx.body = { symbol, watched: false };
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Unwatch IPO' });
      ctx.body = errorBody('Failed to unwatch IPO', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/company-profile/:sym', async (ctx) => {
    try {
      if (ctx.params.sym) {
        sendRead(
          ctx,
          await research.getProfile(ctx.params.sym.toUpperCase(), isForcedRefresh(ctx)),
          'Get company profile'
        );
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

  router.get('/live/search', async (ctx) => {
    const q = Array.isArray(ctx.query.q) ? ctx.query.q[0] : ctx.query.q;
    try {
      if (!q || q.trim().length < 2) {
        ctx.body = [];
        ctx.status = 200;
        return;
      }
      const result = await searchSymbols(q.trim());
      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Symbol search "${q}"` });
      ctx.body = errorBody('Failed to search symbols', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/metrics/:sym', async (ctx) => {
    try {
      sendRead(ctx, await research.getMetrics(ctx.params.sym.toUpperCase(), isForcedRefresh(ctx)), 'Get stock metrics');
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get stock metrics "${ctx.params.sym}"` });
      ctx.body = errorBody('Failed to get stock metrics', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/peers/:sym', async (ctx) => {
    try {
      sendRead(ctx, await research.getPeers(ctx.params.sym.toUpperCase(), isForcedRefresh(ctx)), 'Get stock peers');
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get stock peers "${ctx.params.sym}"` });
      ctx.body = errorBody('Failed to get stock peers', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/earnings/:sym', async (ctx) => {
    try {
      sendRead(ctx, await research.getEarnings(ctx.params.sym.toUpperCase(), isForcedRefresh(ctx)), 'Get earnings');
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get earnings calendar "${ctx.params.sym}"` });
      ctx.body = errorBody('Failed to get earnings', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/earnings-history/:sym', async (ctx) => {
    try {
      sendRead(
        ctx,
        await research.getEarningsHistory(ctx.params.sym.toUpperCase(), isForcedRefresh(ctx)),
        'Get earnings history'
      );
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get earnings history "${ctx.params.sym}"` });
      ctx.body = errorBody('Failed to get earnings history', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/insider/:sym', async (ctx) => {
    try {
      sendRead(
        ctx,
        await research.getInsiderTransactions(ctx.params.sym.toUpperCase(), isForcedRefresh(ctx)),
        'Get insider transactions'
      );
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
      const forceRefresh = isForcedRefresh(ctx);
      // Unknown category names are dropped by the controller rather than erroring,
      // so a stale bookmark still returns the full digest.
      const raw = Array.isArray(ctx.query.category) ? ctx.query.category : [ctx.query.category];
      const categories = raw.flatMap((value) => String(value ?? '').split(',')).filter(Boolean);
      const result = await new MarketNewsController().getTopNews(forceRefresh, categories);
      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Get market news' });
      ctx.body = errorBody('Failed to get market news', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/portfolio-news', async (ctx) => {
    try {
      const forceRefresh = isForcedRefresh(ctx);
      const result = await new MarketNewsController().getPortfolioNews(forceRefresh);
      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Get portfolio news' });
      ctx.body = errorBody('Failed to get portfolio news', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/market-movers', async (ctx) => {
    try {
      const forceRefresh = isForcedRefresh(ctx);
      const result = await new MarketMoversController().getMovers(forceRefresh);
      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Get market movers' });
      ctx.body = errorBody('Failed to get market movers', err.message);
      ctx.status = 400;
    }
  });

  router.get('/live/market-status', async (ctx) => {
    try {
      const forceRefresh = isForcedRefresh(ctx);
      const result = await new MarketStatusController().getStatus(forceRefresh);
      ctx.body = result;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Get market status' });
      ctx.body = errorBody('Failed to get market status', err.message);
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
