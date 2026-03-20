import KoaRouter from 'koa-router';
import { TransactionModel } from '../models/TransactionModel';

const transactionModel = TransactionModel();
transactionModel.initialize();

export const TransactionsRouter = () => {
  const router = new KoaRouter();

  // create
  router.put('/transactions', (ctx) => {
    ctx.body = transactionModel.insertOne(ctx.request.body);
    ctx.status = 200;
  });

  /// read
  router.get('/transactions', (ctx) => {
    ctx.body = transactionModel.getAllRecords();
    ctx.status = 200;
  });
  router.get('/transactions/:id', (ctx) => {
    if (ctx.params.id) {
      ctx.body = transactionModel.findById(ctx.params.id);
      ctx.status = 200;
      return;
    }

    ctx.status = 400;
  });

  // update
  router.post('/transactions', (ctx) => {
    const body: any = ctx.request.body;

    ctx.body = transactionModel.insertOrUpdate(body.id, body);
  });

  // delete
  router.delete('/transactions', (ctx) => {
    const body: any = ctx.request.body;

    ctx.body = transactionModel.deleteById(body.id);
    ctx.status = 200;
  });

  return router;
};
