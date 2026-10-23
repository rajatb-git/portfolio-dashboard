import Router from '@koa/router';
import {
  buildAlertContext,
  describeCondition,
  isTriggered,
  loadCostBasis,
  referenceLevel,
  resolveTarget,
} from '../controller/AlertConditions';
import { getCachedQuotes } from '../marketData/quotes';
import { ALERT_CONDITIONS, type AlertCondition, AlertModel, type IAlert } from '../models/AlertModel';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

const SYMBOL_RE = /^[A-Za-z0-9.\-^]{1,20}$/;

const CRITERIA_FIELDS = [
  'symbol',
  'type',
  'condition',
  'direction',
  'targetPrice',
  'trailPercent',
  'thresholdPercent',
] as const satisfies ReadonlyArray<keyof IAlert>;

const parsePercentField = (raw: any, label: string): number => {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value >= 100) {
    throw new Error(`${label} must be a number greater than 0 and less than 100`);
  }
  return value;
};

const parseAlertBody = (raw: any) => {
  const symbol = String(raw?.symbol ?? '')
    .trim()
    .toUpperCase();
  if (!SYMBOL_RE.test(symbol)) throw new Error('Symbol must be 1-20 alphanumeric characters');

  const type = String(raw?.type ?? '').toLowerCase();
  if (type !== 'stock' && type !== 'crypto') throw new Error("Type must be 'stock' or 'crypto'");

  // Alerts created before conditions existed are plain price targets.
  const condition = (String(raw?.condition ?? 'price') || 'price') as AlertCondition;
  if (!ALERT_CONDITIONS.includes(condition)) {
    throw new Error(`Condition must be one of: ${ALERT_CONDITIONS.join(', ')}`);
  }

  const direction = String(raw?.direction ?? '').toLowerCase();
  if (direction !== 'above' && direction !== 'below') throw new Error("Direction must be 'above' or 'below'");

  const note = raw?.note ? String(raw.note) : undefined;
  const base = { symbol, type, condition, direction, ...(note ? { note } : {}) } as const;

  // Only a plain price alert carries a target; the rest derive their level from a
  // percentage, so a stored targetPrice would be a stale duplicate of it.
  if (condition === 'price') {
    const targetPrice = Number(raw?.targetPrice);
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) throw new Error('Target price must be a positive number');
    return { ...base, targetPrice } as const;
  }

  if (condition === 'trailing_stop') {
    return { ...base, targetPrice: 0, trailPercent: parsePercentField(raw?.trailPercent, 'Trail percent') } as const;
  }

  if (condition === 'pct_from_high') {
    return {
      ...base,
      targetPrice: 0,
      thresholdPercent: parsePercentField(raw?.thresholdPercent, 'Threshold percent'),
    } as const;
  }

  return { ...base, targetPrice: 0 } as const;
};

// Checks that need live state rather than just the request body. A trailing
// stop starts from today's price, so its trigger is known from the start
// instead of only after the monitor's next run.
const QUOTE_WAIT_MS = 5000;
const withLiveState = async <T extends { symbol: string; type: string; condition: AlertCondition }>(
  payload: T
): Promise<T & { peakPrice?: number }> => {
  if (payload.condition === 'cost_basis') {
    const basis = await loadCostBasis(new Set([payload.symbol]));
    if (!basis.has(payload.symbol)) {
      throw new Error(`You don't hold ${payload.symbol}, so there's no cost basis to alert on`);
    }
  }
  if (payload.condition !== 'trailing_stop') return payload;
  const quotes = await getCachedQuotes([{ symbol: payload.symbol, isCrypto: payload.type === 'crypto' }], {
    waitForPendingMs: QUOTE_WAIT_MS,
  });
  const price = quotes.get(payload.symbol)?.value?.price;
  return price ? { ...payload, peakPrice: price } : payload;
};

export const AlertsRouter = () => {
  const router = new Router();

  router.get('/alerts', async (ctx) => {
    try {
      const alertModel = await AlertModel().initialize();
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
      const alertModel = await AlertModel().initialize();
      const alerts = alertModel.getAllRecords();
      const quotes = await getCachedQuotes(alerts.map((a) => ({ symbol: a.symbol, isCrypto: a.type === 'crypto' })));

      // Same reference data and evaluator the monitor uses, so the page can never
      // disagree with what actually fires.
      const context = await buildAlertContext(alerts);

      ctx.body = alerts.map((a) => {
        const quote = quotes.get(a.symbol.toUpperCase())?.value;
        // Fall back to the monitor's last recorded price when a live quote isn't
        // available (e.g. market closed), so the UI still shows the latest known state.
        const currentPrice = quote ? +quote.price.toFixed(2) : (a.lastPrice ?? null);
        const resolvedTarget = resolveTarget(a, context);
        return {
          ...a,
          currentPrice,
          percentChange: quote ? +quote.percentChange.toFixed(2) : null,
          resolvedTarget,
          // How far the price has to move to reach the trigger, signed.
          distancePercent:
            currentPrice && resolvedTarget !== null
              ? +(((resolvedTarget - currentPrice) / currentPrice) * 100).toFixed(2)
              : null,
          reference: referenceLevel(a, context),
          conditionLabel: describeCondition(a, context),
          triggered: currentPrice != null && isTriggered(a, currentPrice, context),
        };
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
      const alertModel = await AlertModel().initialize();
      const payload = await withLiveState(parseAlertBody(ctx.request.body));
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
      const alertModel = await AlertModel().initialize();
      const { id } = ctx.params;
      const existing = alertModel.findById(id);
      if (!existing) {
        ctx.status = 404;
        ctx.body = errorBody('Alert not found', `No alert with id ${id}`);
        return;
      }
      const payload: Partial<IAlert> = parseAlertBody(ctx.request.body);
      // Monitor state only stays meaningful while the alert watches the same thing.
      const sameCriteria = CRITERIA_FIELDS.every((field) => existing[field] === payload[field]);
      const monitorState = sameCriteria
        ? {
            ...(existing.peakPrice !== undefined && { peakPrice: existing.peakPrice }),
            ...(existing.triggeredAt && { triggeredAt: existing.triggeredAt }),
          }
        : {};
      const seeded = sameCriteria ? payload : await withLiveState(payload as ReturnType<typeof parseAlertBody>);
      const carried = {
        ...(existing.symbol === payload.symbol &&
          existing.lastPrice !== undefined && { lastPrice: existing.lastPrice }),
        ...(existing.lastCheckedAt && { lastCheckedAt: existing.lastCheckedAt }),
      };
      ctx.body = await alertModel.replaceById(id, { ...seeded, ...carried, ...monitorState });
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Update alert' });
      ctx.body = errorBody('Failed to update alert', err.message);
      ctx.status = 400;
    }
  });

  router.delete('/alerts/:id', async (ctx) => {
    try {
      const alertModel = await AlertModel().initialize();
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
