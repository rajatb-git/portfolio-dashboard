import Router from '@koa/router';
import moment from 'moment';
import { WatchlistDBModel } from '../models/WatchlistModel';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

const watchlistModel = WatchlistDBModel();
watchlistModel.initialize();

export const WatchlistRouter = () => {
  const router = new Router();

  router.get('/watchlist', async (ctx) => {
    try {
      const items = watchlistModel.getAllRecords();
      ctx.body = items;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Get watchlist' });
      ctx.body = errorBody('Failed to get watchlist', err.message);
      ctx.status = 400;
    }
  });

  router.post('/watchlist/:sym', async (ctx) => {
    try {
      const sym = ctx.params.sym.toUpperCase();
      const existing = watchlistModel.findById(sym);
      if (existing) {
        ctx.body = existing;
        ctx.status = 200;
        return;
      }
      const item = await watchlistModel.insertOne({ symbol: sym, addedAt: moment().toISOString() }, sym);
      ctx.body = item;
      ctx.status = 201;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Add watchlist "${ctx.params.sym}"` });
      ctx.body = errorBody('Failed to add to watchlist', err.message);
      ctx.status = 400;
    }
  });

  router.delete('/watchlist/:sym', async (ctx) => {
    try {
      await watchlistModel.deleteById(ctx.params.sym.toUpperCase());
      ctx.body = { deleted: ctx.params.sym.toUpperCase() };
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Delete watchlist "${ctx.params.sym}"` });
      ctx.body = errorBody('Failed to remove from watchlist', err.message);
      ctx.status = 400;
    }
  });

  return router;
};
