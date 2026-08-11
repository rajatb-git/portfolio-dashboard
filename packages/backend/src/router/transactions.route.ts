import Router from '@koa/router';
import moment from 'moment';
import { adjustCash, transactionCashImpact } from '../controller/CashController';
import { TransactionModel } from '../models/TransactionModel';
import { normalizeTradeDate } from '../utils';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

const VALID_TYPES = ['stock', 'crypto', 'cash'];
const VALID_ACTIONS = ['buy', 'sell', 'deposit', 'withdraw'];

const parseMoney = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = parseFloat(String(value).replace(/[$,\s]/g, ''));
  return Number.isNaN(parsed) ? undefined : parsed;
};

// A cleared date in the grid comes back as null/'' — drop the key entirely so the
// row falls back to createdAt rather than storing an empty string.
const withNormalizedDate = (body: any) => {
  const { date, ...rest } = body ?? {};
  const normalized = normalizeTradeDate(date);
  return { ...rest, ...(normalized && { date: normalized }) };
};

export const TransactionsRouter = () => {
  const router = new Router();

  // bulk import (generic CSV template -> transaction log, no holdings side effects)
  router.post('/transactions/import', async (ctx) => {
    try {
      const transactionModel = await TransactionModel().initialize();
      const incoming = ctx.request.body;
      if (!Array.isArray(incoming) || incoming.length === 0) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid import', 'Expected a non-empty array of transactions');
        return;
      }

      const rows = incoming.map((raw: any, i: number) => {
        const row = `Row ${i + 1}`;
        const accountId = String(raw.accountId ?? '').trim();
        if (!accountId) throw new Error(`${row}: accountId is required`);

        const type = String(raw.type ?? '')
          .trim()
          .toLowerCase();
        if (!VALID_TYPES.includes(type)) {
          throw new Error(`${row}: type must be one of ${VALID_TYPES.join(', ')}`);
        }

        const action = String(raw.action ?? '')
          .trim()
          .toLowerCase();
        if (!VALID_ACTIONS.includes(action)) {
          throw new Error(`${row}: action must be one of ${VALID_ACTIONS.join(', ')}`);
        }

        const qty = parseFloat(String(raw.qty));
        if (Number.isNaN(qty)) throw new Error(`${row}: qty must be a number`);

        const price = parseMoney(raw.price);
        const pnl = parseMoney(raw.pnl);
        const date = raw.date ? moment(String(raw.date)) : undefined;

        return {
          accountId,
          type,
          action,
          qty,
          ...(raw.symbol && { symbol: String(raw.symbol).trim().toUpperCase() }),
          ...(price !== undefined && { price }),
          ...(pnl !== undefined && { pnl }),
          ...(date?.isValid() && { date: date.toISOString() }),
        };
      });

      const inserted = await transactionModel.insertMany(rows);
      ctx.status = 200;
      ctx.body = { message: `Imported ${inserted.length} transaction(s)`, count: inserted.length };
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Import transactions' });
      ctx.body = errorBody('Failed to import transactions', err.message);
      ctx.status = 400;
    }
  });

  // create
  router.put('/transactions', async (ctx) => {
    try {
      const transactionModel = await TransactionModel().initialize();
      ctx.body = await transactionModel.insertOne(withNormalizedDate(ctx.request.body));
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Create transaction' });
      ctx.body = errorBody('Failed to create transaction', err.message);
      ctx.status = 400;
    }
  });

  /// read
  router.get('/transactions', async (ctx) => {
    try {
      const transactionModel = await TransactionModel().initialize();
      ctx.body = transactionModel.getAllRecords();
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Get transactions' });
      ctx.body = errorBody('Failed to get transactions', err.message);
      ctx.status = 400;
    }
  });

  router.get('/transactions/symbol/:symbol', async (ctx) => {
    try {
      const transactionModel = await TransactionModel().initialize();
      const { symbol } = ctx.params;
      if (!symbol || !/^[A-Za-z0-9.\-^]{1,20}$/.test(symbol)) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid symbol', 'Symbol must be 1-20 alphanumeric characters');
        return;
      }
      const upperSymbol = symbol.toUpperCase();
      ctx.body = transactionModel.getAllRecords().filter((t) => (t.symbol ?? '').toUpperCase() === upperSymbol);
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Get transactions by symbol' });
      ctx.body = errorBody('Failed to get transactions', err.message);
      ctx.status = 400;
    }
  });

  router.get('/transactions/:id', async (ctx) => {
    try {
      const transactionModel = await TransactionModel().initialize();
      if (ctx.params.id) {
        ctx.body = transactionModel.findById(ctx.params.id);
        ctx.status = 200;
        return;
      }
      ctx.status = 400;
      ctx.body = errorBody('Missing parameter', 'Transaction ID is required');
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Get transaction by ID' });
      ctx.body = errorBody('Failed to get transaction', err.message);
      ctx.status = 400;
    }
  });

  // update
  router.post('/transactions', async (ctx) => {
    try {
      const transactionModel = await TransactionModel().initialize();
      const body: any = ctx.request.body;
      const previous = body.id ? transactionModel.findById(body.id) : null;

      const saved = await transactionModel.insertOrUpdate(withNormalizedDate(body), body.id);

      // Keep account cash in sync with manual edits to the transaction log:
      // undo the previous row's cash effect, then apply the saved row's effect.
      if (previous) {
        await adjustCash(previous.accountId, -transactionCashImpact(previous));
      }
      await adjustCash(saved.accountId, transactionCashImpact(saved));

      ctx.body = saved;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Update transaction' });
      ctx.body = errorBody('Failed to update transaction', err.message);
      ctx.status = 400;
    }
  });

  // delete
  router.delete('/transactions', async (ctx) => {
    try {
      const transactionModel = await TransactionModel().initialize();
      const body: any = ctx.request.body;
      const previous = body.id ? transactionModel.findById(body.id) : null;

      ctx.body = await transactionModel.deleteById(body.id);

      if (previous) {
        await adjustCash(previous.accountId, -transactionCashImpact(previous));
      }
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Delete transaction' });
      ctx.body = errorBody('Failed to delete transaction', err.message);
      ctx.status = 400;
    }
  });

  return router;
};
