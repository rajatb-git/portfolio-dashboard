import KoaRouter from 'koa-router';
import moment from 'moment';
import { logger } from '../utils/winston';
import { WatchlistDBModel } from '../models/WatchlistModel';

const watchlistModel = WatchlistDBModel();
watchlistModel.initialize();

export const WatchlistRouter = () => {
  const router = new KoaRouter();

  router.get('/watchlist', async (ctx) => {
    try {
      const items = watchlistModel.getAllRecords();
      ctx.body = items;
      ctx.status = 200;
    } catch (err) {
      logger.log({ level: 'error', message: err.message, label: 'Get watchlist' });
      ctx.body = err.message;
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
    } catch (err) {
      logger.log({ level: 'error', message: err.message, label: `Add watchlist "${ctx.params.sym}"` });
      ctx.body = err.message;
      ctx.status = 400;
    }
  });

  router.delete('/watchlist/:sym', async (ctx) => {
    try {
      await watchlistModel.deleteById(ctx.params.sym.toUpperCase());
      ctx.body = { deleted: ctx.params.sym.toUpperCase() };
      ctx.status = 200;
    } catch (err) {
      logger.log({ level: 'error', message: err.message, label: `Delete watchlist "${ctx.params.sym}"` });
      ctx.body = err.message;
      ctx.status = 400;
    }
  });

  return router;
};
