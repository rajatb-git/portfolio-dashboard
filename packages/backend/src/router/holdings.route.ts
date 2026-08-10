import moment from 'moment';
import Router from '@koa/router';
import { buy } from '../controller/BuyController';
import { adjustCash } from '../controller/CashController';
import { sell } from '../controller/SellController';
import { LiveQuoteController } from '../controller/LiveQuoteController';
import { HoldingsModel } from '../models/HoldingsModel';
import { normalizeTradeDate } from '../utils';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

export const HoldingsRouter = () => {
  const router = new Router();

  // create
  router.put('/holdings', async (ctx) => {
    try {
      const holdingsModel = await HoldingsModel().initialize();
      ctx.body = holdingsModel.insertOne(ctx.request.body);
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Insert holding' });
      ctx.status = 500;
      ctx.body = errorBody('Failed to insert holding', error.message);
    }
  });

  // read
  router.get('/holdings', async (ctx) => {
    try {
      const holdingsModel = await HoldingsModel().initialize();
      ctx.body = holdingsModel.getAllRecords();
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Get holdings' });
      ctx.status = 500;
      ctx.body = errorBody('Failed to get holdings', error.message);
    }
  });

  router.get('/holdings/symbol/:symbol', async (ctx) => {
    try {
      const holdingsModel = await HoldingsModel().initialize();
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
      const livePrice = await quoteController.getLiveQuote(upperSymbol, isCrypto).catch((err: any) => {
        logger.log({
          level: 'error',
          label: `holdings by symbol "${upperSymbol}"`,
          message: `Live quote fetch failed: ${err?.message ?? err}`,
        });
        return null;
      });

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
      logger.log({
        level: 'error',
        label: 'holdings by symbol',
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      ctx.status = 500;
      ctx.body = errorBody('Failed to get holdings by symbol', error.message);
    }
  });

  router.get('/holdings/:id', async (ctx) => {
    try {
      const holdingsModel = await HoldingsModel().initialize();
      if (ctx.params.id) {
        ctx.body = holdingsModel.findById(ctx.params.id);
        ctx.status = 200;
        return;
      }
      ctx.status = 400;
      ctx.body = errorBody('Holding ID is required', 'Holding ID is required');
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: `Get holding "${ctx.params.id}"` });
      ctx.status = 500;
      ctx.body = errorBody('Failed to get holding', error.message);
    }
  });

  // update
  router.post('/holdings', async (ctx) => {
    try {
      const holdingsModel = await HoldingsModel().initialize();
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
      const holdingsModel = await HoldingsModel().initialize();
      if (ctx.params.id) {
        await holdingsModel.deleteById(ctx.params.id);

        ctx.status = 200;
        ctx.body = { message: 'Holding deleted successfully' };
        return;
      }
      ctx.status = 400;
      ctx.body = errorBody('Holding ID is required', 'Holding ID is required');
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: `Delete holding "${ctx.params.id}"` });
      ctx.status = 500;
      ctx.body = errorBody('Failed to delete Holding', error.message);
    }
  });

  // complete buy transaction
  router.post('/holdings/buy', async (ctx) => {
    const body: any = ctx.request.body;
    if (body) {
      try {
        const { date, ...holding } = body;
        ctx.body = await buy(holding, normalizeTradeDate(date));
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
        const { date, ...holding } = body;
        ctx.body = await sell(holding, normalizeTradeDate(date));
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
  router.post('/holdings/import', async (ctx) => {
    try {
      const holdingsModel = await HoldingsModel().initialize();
      const incomingArr = ctx.request.body as Array<any>;

      const isCashRow = (x: any) => String(x['symbol'] ?? '').trim().toUpperCase() === 'CASH';
      const parseMoney = (value: any) => parseFloat(String(value ?? '').replace(/\$/g, ''));

      const arrHolding = incomingArr
        .filter((x) => !isCashRow(x))
        .map((x) => ({
          symbol: x['symbol'],
          name: x['name'],
          qty: parseFloat(x['qty']),
          averagePrice: parseMoney(x['averagePrice']),
          accountId: x.accountId,
          type: x.type,
        }));

      if (arrHolding.length > 0) {
        await holdingsModel.insertMany(arrHolding);
      }

      // A row with symbol CASH sets an opening cash balance rather than a position.
      for (const row of incomingArr.filter(isCashRow)) {
        const qty = parseFloat(row['qty']);
        const price = parseMoney(row['averagePrice']);
        const amount = (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(price) ? price : 1);
        if (amount !== 0) {
          await adjustCash(row.accountId, amount);
        }
      }

      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Import holdings' });
      ctx.status = 500;
      ctx.body = errorBody('Failed to import', error.message);
    }
  });

  return router;
};
