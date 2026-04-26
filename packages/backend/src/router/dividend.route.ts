import KoaRouter from 'koa-router';
import { DividendController } from '../controller/DividendController';
import { DividendDBModel } from '../models/DividendModel';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

export const DividendRouter = () => {
  const router = new KoaRouter();
  const dividendController = new DividendController();

  // Get all dividend records
  router.get('/dividends', async (ctx) => {
    try {
      const dividendModel = await DividendDBModel().initialize();
      ctx.body = dividendModel.getAllRecords();
      ctx.status = 200;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to get dividends', error.message);
    }
  });

  // Get dividend summary (aggregated income metrics)
  router.get('/dividends/summary', async (ctx) => {
    try {
      ctx.body = await dividendController.getDividendSummary();
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Dividend summary route' });
      ctx.body = errorBody('Failed to get dividend summary', error.message);
      ctx.status = 400;
    }
  });

  // Get dividends for a specific symbol
  router.get('/dividends/:symbol', async (ctx) => {
    try {
      const dividendModel = await DividendDBModel().initialize();
      const all = dividendModel.getAllRecords().filter((d) => d.holdingSymbol === ctx.params.symbol);
      ctx.body = all;
      ctx.status = 200;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to get dividends for symbol', error.message);
    }
  });

  // Fetch live dividend data from FinnHub (with caching)
  router.get('/live/dividends/:symbol', async (ctx) => {
    try {
      ctx.body = await dividendController.fetchAndStoreDividends(ctx.params.symbol);
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Live dividend fetch route' });
      ctx.body = errorBody('Failed to fetch dividends', error.message);
      ctx.status = 400;
    }
  });

  // Manually add a dividend record
  router.put('/dividends', async (ctx) => {
    try {
      const dividendModel = await DividendDBModel().initialize();
      ctx.body = await dividendModel.insertOne(ctx.request.body);
      ctx.status = 200;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to insert dividend', error.message);
    }
  });

  // Delete a dividend record
  router.delete('/dividends/:id', async (ctx) => {
    try {
      if (ctx.params.id) {
        const dividendModel = await DividendDBModel().initialize();
        await dividendModel.deleteById(ctx.params.id);
        ctx.status = 200;
        ctx.body = { message: 'Dividend deleted successfully' };
        return;
      }
      ctx.status = 400;
      ctx.body = errorBody('Dividend ID is required', 'Dividend ID is required');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to delete dividend', error.message);
    }
  });

  return router;
};
