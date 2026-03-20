import KoaRouter from 'koa-router';

import { HoldingsModel } from '../models/HoldingsModel';
import { logger } from '../utils/winston';
import { buy } from '../controller/BuyController';
import { sell } from '../controller/SellController';
import { errorBody } from '../utils/error';

const holdingsModel = HoldingsModel();
holdingsModel.initialize();

export const HoldingsRouter = () => {
  const router = new KoaRouter();

  // create
  router.put('/holdings', (ctx) => {
    try {
      ctx.body = holdingsModel.insertOne(ctx.request.body);
      ctx.status = 200;
    } catch (error) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to insert holding', error.message);
    }
  });

  // read
  router.get('/holdings', (ctx) => {
    try {
      ctx.body = holdingsModel.getAllRecords();
      ctx.status = 200;
    } catch (error) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to get holdings', error.message);
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
    } catch (error) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to get holding', error.message);
    }
  });

  // update
  router.post('/holdings', (ctx) => {
    try {
      const body: any = ctx.request.body;

      ctx.body = holdingsModel.insertOrUpdate(body.id, body);
      ctx.status = 200;
    } catch (error) {
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
    } catch (error) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to delete Holding', error.message);
    }
  });

  // complete buy transaction
  router.post('/holdings/buy', (ctx) => {
    const body: any = ctx.request.body;
    if (body) {
      try {
        ctx.body = buy(body);
        ctx.status = 200;
        return;
      } catch (error) {
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
  router.post('/holdings/sell', (ctx) => {
    const body: any = ctx.request.body;

    if (body) {
      try {
        ctx.body = sell(body);
        ctx.status = 200;
        return;
      } catch (error) {
        logger.log({
          level: 'error',
          lable: 'sell',
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
    } catch (error) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to import', error.message);
    }
  });

  return router;
};
