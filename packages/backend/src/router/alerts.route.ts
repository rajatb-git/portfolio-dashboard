import Router from '@koa/router';
import { LiveQuoteController } from '../controller/LiveQuoteController';
import { AlertModel } from '../models/AlertModel';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

const alertModel = AlertModel();
alertModel.initialize();

const SYMBOL_RE = /^[A-Za-z0-9.\-^]{1,20}$/;

const parseAlertBody = (raw: any) => {
  const symbol = String(raw?.symbol ?? '')
    .trim()
    .toUpperCase();
  if (!SYMBOL_RE.test(symbol)) throw new Error('Symbol must be 1-20 alphanumeric characters');

  const type = String(raw?.type ?? '').toLowerCase();
  if (type !== 'stock' && type !== 'crypto') throw new Error("Type must be 'stock' or 'crypto'");

  const direction = String(raw?.direction ?? '').toLowerCase();
  if (direction !== 'above' && direction !== 'below') throw new Error("Direction must be 'above' or 'below'");

  const targetPrice = Number(raw?.targetPrice);
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) throw new Error('Target price must be a positive number');

  const note = raw?.note ? String(raw.note) : undefined;
  return { symbol, type, direction, targetPrice, ...(note ? { note } : {}) } as const;
};

export const AlertsRouter = () => {
  const router = new Router();

  router.get('/alerts', (ctx) => {
    try {
      ctx.body = alertModel.getAllRecords();
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Get alerts' });
      ctx.body = errorBody('Failed to get alerts', err.message);
      ctx.status = 400;
    }
  });

  // Alerts enriched with live price and whether the target has been reached.
  router.get('/alerts/status', async (ctx) => {
    try {
      const alerts = alertModel.getAllRecords();
      const quoteController = new LiveQuoteController();

      // One quote per unique symbol (preserve crypto flag).
      const symbolMeta = new Map<string, boolean>();
      for (const a of alerts) if (!symbolMeta.has(a.symbol)) symbolMeta.set(a.symbol, a.type === 'crypto');

      const symbols = [...symbolMeta.keys()];
      const quotes = await Promise.all(
        symbols.map((sym) =>
          quoteController
            .getLiveQuote(sym, symbolMeta.get(sym))
            .then((q) => q)
            .catch(() => null)
        )
      );
      const priceMap = new Map(symbols.map((sym, i) => [sym, quotes[i]]));

      ctx.body = alerts.map((a) => {
        const quote = priceMap.get(a.symbol);
        const currentPrice = quote ? +quote.price.toFixed(2) : null;
        const triggered =
          currentPrice != null &&
          (a.direction === 'above' ? currentPrice >= a.targetPrice : currentPrice <= a.targetPrice);
        return { ...a, currentPrice, percentChange: quote ? +quote.percentChange.toFixed(2) : null, triggered };
      });
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Get alert status' });
      ctx.body = errorBody('Failed to get alert status', err.message);
      ctx.status = 400;
    }
  });

  router.put('/alerts', async (ctx) => {
    try {
      const payload = parseAlertBody(ctx.request.body);
      ctx.body = await alertModel.insertOne(payload);
      ctx.status = 201;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Create alert' });
      ctx.body = errorBody('Failed to create alert', err.message);
      ctx.status = 400;
    }
  });

  router.post('/alerts/:id', async (ctx) => {
    try {
      const { id } = ctx.params;
      if (!alertModel.findById(id)) {
        ctx.status = 404;
        ctx.body = errorBody('Alert not found', `No alert with id ${id}`);
        return;
      }
      const payload = parseAlertBody(ctx.request.body);
      ctx.body = await alertModel.insertOrUpdate(payload, id);
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Update alert' });
      ctx.body = errorBody('Failed to update alert', err.message);
      ctx.status = 400;
    }
  });

  router.delete('/alerts/:id', async (ctx) => {
    try {
      await alertModel.deleteById(ctx.params.id);
      ctx.body = { deleted: ctx.params.id };
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Delete alert' });
      ctx.body = errorBody('Failed to delete alert', err.message);
      ctx.status = 400;
    }
  });

  return router;
};
