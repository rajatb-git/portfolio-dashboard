import moment from 'moment';
import KoaRouter from 'koa-router';
import { buy } from '../controller/BuyController';
import { sell } from '../controller/SellController';
import { LiveQuoteController } from '../controller/LiveQuoteController';
import { HoldingsModel } from '../models/HoldingsModel';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

const holdingsModel = HoldingsModel();
holdingsModel.initialize();

export const HoldingsRouter = () => {
  const router = new KoaRouter();

  // create
  router.put('/holdings', (ctx) => {
    try {
      ctx.body = holdingsModel.insertOne(ctx.request.body);
      ctx.status = 200;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to insert holding', error.message);
    }
  });

  // read
  router.get('/holdings', (ctx) => {
    try {
      ctx.body = holdingsModel.getAllRecords();
      ctx.status = 200;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to get holdings', error.message);
    }
  });

  router.get('/holdings/symbol/:symbol', async (ctx) => {
    try {
      const { symbol } = ctx.params;
      if (!symbol || !/^[A-Za-z0-9.\-^]{1,20}$/.test(symbol)) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid symbol', 'Symbol must be 1-20 alphanumeric characters');
        return;
      }
      const upperSymbol = symbol.toUpperCase();
      const matching = holdingsModel.getAllRecords().filter((h) => h.symbol.toUpperCase() === upperSymbol);

      if (matching.length === 0) {
        ctx.body = [];
        ctx.status = 200;
        return;
      }

      const isCrypto = matching[0].type === 'crypto';
      const quoteController = new LiveQuoteController();
      const livePrice = await quoteController.getLiveQuote(upperSymbol, isCrypto).catch(() => null);

      if (!livePrice) {
        ctx.body = [];
        ctx.status = 200;
        return;
      }

      ctx.body = matching.map((holding) => {
        const originalValue = holding.qty * holding.averagePrice;
        const totalGL = +(holding.qty * livePrice.price - originalValue).toFixed(2);
        return {
          ...holding,
          currentPrice: +livePrice.price.toFixed(2),
          priceDate: moment(livePrice.priceDate).format('lll'),
          percentChange: +livePrice.percentChange.toFixed(2),
          dayHigh: livePrice.dayHigh,
          dayLow: livePrice.dayLow,
          originalValue,
          totalGL,
          totalGLPercent: +((totalGL / originalValue) * 100).toFixed(2),
          marketValue: +(holding.qty * livePrice.price).toFixed(2),
        };
      });
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', label: 'holdings by symbol', message: error.message, name: error.name, stack: error.stack });
      ctx.status = 500;
      ctx.body = errorBody('Failed to get holdings by symbol', error.message);
    }
  });

  router.get('/holdings/:id', (ctx) => {
    try {
      if (ctx.params.id) {
        ctx.body = holdingsModel.findById(ctx.params.id);
        ctx.status = 200;
        return;
      }
      ctx.status = 400;
      ctx.body = errorBody('Holding ID is required', 'Holding ID is required');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to get holding', error.message);
    }
  });

  // update
  router.post('/holdings', async (ctx) => {
    try {
      const body: any = ctx.request.body;

      ctx.body = await holdingsModel.insertOrUpdate(body, body.id);
      ctx.status = 200;
    } catch (error: any) {
      logger.log({
        level: 'error',
        label: 'Update holding',
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      ctx.status = 500;
      ctx.body = errorBody('Failed to update holding', error.message);
    }
  });

  // delete
  router.delete('/holdings/:id', async (ctx) => {
    try {
      if (ctx.params.id) {
        await holdingsModel.deleteById(ctx.params.id);

        ctx.status = 200;
        ctx.body = { message: 'Holding deleted successfully' };
        return;
      }
      ctx.status = 400;
      ctx.body = errorBody('Holding ID is required', 'Holding ID is required');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to delete Holding', error.message);
    }
  });

  // complete buy transaction
  router.post('/holdings/buy', async (ctx) => {
    const body: any = ctx.request.body;
    if (body) {
      try {
        ctx.body = await buy(body);
        ctx.status = 200;
        return;
      } catch (error: any) {
        logger.log({
          level: 'error',
          label: 'buy',
          message: error.message,
          name: error.name,
          stack: error.stack,
        });

        ctx.body = errorBody('Failed to buy', error.message);
        ctx.status = 400;
        return;
      }
    } else {
      ctx.status = 406;
      ctx.body = errorBody('Failed to buy', 'Input data missing');
    }
  });

  // complete sell transaction
  router.post('/holdings/sell', async (ctx) => {
    const body: any = ctx.request.body;

    if (body) {
      try {
        ctx.body = await sell(body);
        ctx.status = 200;
        return;
      } catch (error: any) {
        logger.log({
          level: 'error',
          label: 'sell',
          message: error.message,
          name: error.name,
          stack: error.stack,
        });

        ctx.body = errorBody('Failed to sell', error.message);
        ctx.status = 400;
        return;
      }
    } else {
      ctx.status = 406;
      ctx.body = errorBody('Failed to sell', 'Input data missing');
    }
  });

  // file import
  router.post('/holdings/import', (ctx) => {
    try {
      const incomingArr = ctx.request.body as Array<any>;

      const arrHolding = incomingArr.map((x) => ({
        symbol: x['symbol'],
        name: x['name'],
        qty: parseFloat(x['qty']),
        averagePrice: parseFloat(x['averagePrice'].replaceAll('$', '')),
        accountId: x.accountId,
        type: x.type,
      }));

      holdingsModel.insertMany(arrHolding);
      ctx.status = 200;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to import', error.message);
    }
  });

  return router;
};
