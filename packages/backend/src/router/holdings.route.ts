import { randomUUID } from 'node:crypto';
import Router from '@koa/router';
import moment from 'moment';
import { buy } from '../controller/BuyController';
import { sell } from '../controller/SellController';
import {
  enrichLots,
  LOT_METHODS,
  LotMethod,
  resolveLots,
  summarizeLots,
  totalsFromLots,
} from '../controller/TaxLotController';
import { simulateTrade } from '../controller/TradeSimulatorController';
import { getQuote } from '../marketData/quotes';
import { HoldingsModel, ITaxLot } from '../models/HoldingsModel';
import { getTaxConfig } from '../models/TaxConfigModel';
import { TransactionModel } from '../models/TransactionModel';
import { normalizeTradeDate, roundQty } from '../utils';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

// Lot method and lot ids ride along on sell/simulate bodies; reject anything
// that isn't one of the known methods rather than silently falling back to FIFO.
const parseLotOptions = (body: any): { lotMethod?: LotMethod; lotIds?: string[] } => {
  const { lotMethod, lotIds } = body ?? {};
  if (lotMethod !== undefined && !LOT_METHODS.includes(lotMethod)) {
    throw new Error(`lotMethod must be one of ${LOT_METHODS.join(', ')}`);
  }
  if (lotIds !== undefined && (!Array.isArray(lotIds) || lotIds.some((id) => typeof id !== 'string'))) {
    throw new Error('lotIds must be an array of lot ids');
  }
  if (lotMethod === 'specific' && !lotIds?.length) {
    throw new Error('Choose at least one lot to sell');
  }
  return { lotMethod, lotIds };
};

const parseLots = (raw: unknown): ITaxLot[] => {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('A position needs at least one lot');
  return raw.map((lot: any, i: number) => {
    const row = `Lot ${i + 1}`;
    const qty = Number(lot?.qty);
    if (!Number.isFinite(qty) || qty <= 0) throw new Error(`${row}: quantity must be a positive number`);
    const price = Number(lot?.price);
    if (!Number.isFinite(price) || price < 0) throw new Error(`${row}: cost must be zero or a positive number`);
    const date = moment(String(lot?.date ?? ''), ['YYYY-MM-DD', moment.ISO_8601], true);
    if (!date.isValid()) throw new Error(`${row}: enter a valid purchase date`);
    if (date.isAfter(moment(), 'day')) throw new Error(`${row}: purchase date cannot be in the future`);
    return {
      id: typeof lot.id === 'string' && lot.id ? lot.id : randomUUID(),
      qty: roundQty(qty),
      price,
      date: date.toISOString(),
      ...(lot.estimated === true && { estimated: true }),
    };
  });
};

export const HoldingsRouter = () => {
  const router = new Router();

  // create
  router.put('/holdings', async (ctx) => {
    try {
      const holdingsModel = await HoldingsModel().initialize();
      ctx.body = await holdingsModel.insertOne(ctx.request.body);
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
      const [livePrice, txModel, taxConfig] = await Promise.all([
        getQuote(upperSymbol, isCrypto).catch((err: any) => {
          logger.log({
            level: 'error',
            label: `holdings by symbol "${upperSymbol}"`,
            message: `Live quote fetch failed: ${err?.message ?? err}`,
          });
          return null;
        }),
        TransactionModel().initialize(),
        getTaxConfig(),
      ]);

      if (!livePrice) {
        ctx.body = [];
        ctx.status = 200;
        return;
      }

      const transactions = txModel.getAllRecords();
      ctx.body = matching.map((holding) => {
        const originalValue = holding.qty * holding.averagePrice;
        const totalGL = +(holding.qty * livePrice.price - originalValue).toFixed(2);
        const lots = enrichLots(resolveLots(holding, transactions), livePrice.price);
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
          lots,
          tax: summarizeLots(lots, taxConfig),
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

  // Replace a position's tax lots. Quantity and average cost follow the lots;
  // no trade is recorded and cash is untouched.
  router.put('/holdings/:id/lots', async (ctx) => {
    try {
      const holdingsModel = await HoldingsModel().initialize();
      const holding = holdingsModel.findById(ctx.params.id);
      if (!holding) {
        ctx.status = 404;
        ctx.body = errorBody('Holding not found', `Holding ${ctx.params.id} not found`);
        return;
      }
      let lots: ITaxLot[];
      try {
        lots = parseLots((ctx.request.body as any)?.lots);
      } catch (error: any) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid tax lots', error.message);
        return;
      }
      ctx.body = await holdingsModel.updateById(holding.id, { lots, ...totalsFromLots(lots) });
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: `Update lots "${ctx.params.id}"` });
      ctx.status = 500;
      ctx.body = errorBody('Failed to update tax lots', error.message);
    }
  });

  // Mock buy/sell: computes tax and position impact without writing anything.
  router.post('/holdings/simulate', async (ctx) => {
    try {
      const body: any = ctx.request.body ?? {};
      ctx.body = await simulateTrade({ ...body, ...parseLotOptions(body) });
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Simulate trade' });
      ctx.status = 400;
      ctx.body = errorBody('Failed to simulate trade', error.message);
    }
  });

  // update
  router.post('/holdings', async (ctx) => {
    try {
      const holdingsModel = await HoldingsModel().initialize();
      const body: any = ctx.request.body;
      if (!body?.id) {
        ctx.status = 400;
        ctx.body = errorBody('Holding ID is required', 'Holding ID is required');
        return;
      }

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
        const { date, lotMethod: _lotMethod, lotIds: _lotIds, ...holding } = body;
        ctx.body = await sell(holding, normalizeTradeDate(date), parseLotOptions(body));
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

  return router;
};
