import KoaRouter from 'koa-router';
import { recordCashMovement } from '../controller/CashController';
import { AccountModel } from '../models/AccountModel';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

const accountsModel = AccountModel();
accountsModel.initialize();

export const AccountsRouter = () => {
  const router = new KoaRouter();

  router.put('/accounts', async (ctx) => {
    try {
      const body: any = ctx.request.body;
      ctx.body = await accountsModel.insertOne(body, body.id);
      ctx.status = 200;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to insert account', error.message);
    }
  });

  // read
  router.get('/accounts', async (ctx) => {
    try {
      ctx.body = accountsModel.getAllRecords();
      ctx.status = 200;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to get accounts', error.message);
    }
  });

  router.get('/accounts/:id', async (ctx) => {
    try {
      if (ctx.params.id) {
        ctx.body = accountsModel.findById(ctx.params.id);
        ctx.status = 200;
        return;
      }
      ctx.status = 400;
      ctx.body = errorBody('Account ID is required', 'Account ID is required');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to get account', error.message);
    }
  });

  // update
  router.post('/accounts', async (ctx) => {
    try {
      const body: any = ctx.request.body;
      ctx.body = await accountsModel.insertOrUpdate(body, body.id);
      ctx.status = 200;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to update account', error.message);
    }
  });

  // deposit/withdraw cash
  router.post('/accounts/:id/cash', async (ctx) => {
    try {
      if (!ctx.params.id) {
        ctx.status = 400;
        ctx.body = errorBody('Account ID is required', 'Account ID is required');
        return;
      }
      const body: any = ctx.request.body;
      const action = body?.action;
      const amount = Number(body?.amount);

      if (action !== 'deposit' && action !== 'withdraw') {
        ctx.status = 400;
        ctx.body = errorBody('Invalid action', "action must be 'deposit' or 'withdraw'");
        return;
      }

      const result = await recordCashMovement(ctx.params.id, amount, action);
      ctx.body = result;
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Cash movement' });
      ctx.status = 400;
      ctx.body = errorBody('Failed to update cash balance', error.message);
    }
  });

  // delete
  router.delete('/accounts/:id', async (ctx) => {
    try {
      if (ctx.params.id) {
        await accountsModel.deleteById(ctx.params.id);
        ctx.status = 200;
        ctx.body = { message: 'Account record deleted successfully' };
        return;
      }
      ctx.status = 400;
      ctx.body = errorBody('Account ID is required', 'Account ID is required');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to delete account', error.message);
    }
  });

  return router;
};
