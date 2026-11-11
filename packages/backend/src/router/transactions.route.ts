import Router from '@koa/router';
import { adjustCash, transactionCashImpact } from '../controller/CashController';
import { applyTradeEdit, reverseTrade } from '../controller/TransactionController';
import { AccountModel } from '../models/AccountModel';
import { TransactionModel } from '../models/TransactionModel';
import { normalizeTradeDate } from '../utils';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

const VALID_TYPES = ['stock', 'crypto', 'cash'];
const VALID_ACTIONS = ['buy', 'sell', 'deposit', 'withdraw'];

// A cleared date in the grid comes back as null/'' — drop the key entirely so the
// row falls back to createdAt rather than storing an empty string.
// `imported` and `cashApplied` are set by the import alone; a create or edit
// can't change what a row did to holdings and cash.
const withNormalizedDate = (body: any) => {
  const { date, imported: _imported, cashApplied: _cashApplied, ...rest } = body ?? {};
  const normalized = normalizeTradeDate(date);
  return { ...rest, ...(normalized && { date: normalized }) };
};

export const TransactionsRouter = () => {
  const router = new Router();

  // create
  router.put('/transactions', async (ctx) => {
    try {
      const transactionModel = await TransactionModel().initialize();
      const body: any = ctx.request.body;
      if (!VALID_ACTIONS.includes(body?.action)) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid transaction', `action must be one of ${VALID_ACTIONS.join(', ')}`);
        return;
      }
      if (!VALID_TYPES.includes(body?.type)) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid transaction', `type must be one of ${VALID_TYPES.join(', ')}`);
        return;
      }
      const saved = await transactionModel.insertOne(withNormalizedDate(body));
      await adjustCash(saved.accountId, transactionCashImpact(saved));
      ctx.body = saved;
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
        const transaction = transactionModel.findById(ctx.params.id);
        if (!transaction) {
          ctx.status = 404;
          ctx.body = errorBody('Transaction not found', `Transaction ${ctx.params.id} not found`);
          return;
        }
        ctx.body = transaction;
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
      if (!body?.id) {
        ctx.status = 400;
        ctx.body = errorBody('Missing parameter', 'Transaction ID is required');
        return;
      }
      if (body.action !== undefined && !VALID_ACTIONS.includes(body.action)) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid transaction', `action must be one of ${VALID_ACTIONS.join(', ')}`);
        return;
      }
      if (body.type !== undefined && !VALID_TYPES.includes(body.type)) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid transaction', `type must be one of ${VALID_TYPES.join(', ')}`);
        return;
      }
      const previous = transactionModel.findById(body.id);
      const next = withNormalizedDate(body);
      if (previous) await applyTradeEdit(previous, next);

      const saved = await transactionModel.insertOrUpdate(next, body.id);

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
      if (!body?.id) {
        ctx.status = 400;
        ctx.body = errorBody('Missing parameter', 'Transaction ID is required');
        return;
      }
      const previous = transactionModel.findById(body.id);
      // Undo the trade on its holding first: if that is refused, nothing has
      // been deleted yet.
      if (previous) await reverseTrade(previous);

      ctx.body = await transactionModel.deleteById(body.id);

      // A row left behind by a deleted account has no cash to put back.
      const accounts = await AccountModel().initialize();
      if (previous && accounts.findById(previous.accountId)) {
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
