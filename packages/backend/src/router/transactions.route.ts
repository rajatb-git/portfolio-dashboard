import KoaRouter from 'koa-router';
import { TransactionModel } from '../models/TransactionModel';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

const transactionModel = TransactionModel();
transactionModel.initialize();

export const TransactionsRouter = () => {
  const router = new KoaRouter();

  // create
  router.put('/transactions', (ctx) => {
    try {
      ctx.body = transactionModel.insertOne(ctx.request.body);
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Create transaction' });
      ctx.body = errorBody('Failed to create transaction', err.message);
      ctx.status = 400;
    }
  });

  /// read
  router.get('/transactions', (ctx) => {
    try {
      ctx.body = transactionModel.getAllRecords();
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Get transactions' });
      ctx.body = errorBody('Failed to get transactions', err.message);
      ctx.status = 400;
    }
  });
  router.get('/transactions/:id', (ctx) => {
    try {
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
      const body: any = ctx.request.body;
      ctx.body = await transactionModel.insertOrUpdate(body, body.id);
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Update transaction' });
      ctx.body = errorBody('Failed to update transaction', err.message);
      ctx.status = 400;
    }
  });

  // delete
  router.delete('/transactions', (ctx) => {
    try {
      const body: any = ctx.request.body;
      ctx.body = transactionModel.deleteById(body.id);
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Delete transaction' });
      ctx.body = errorBody('Failed to delete transaction', err.message);
      ctx.status = 400;
    }
  });

  return router;
};
