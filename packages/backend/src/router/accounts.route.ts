import KoaRouter from 'koa-router';
import { AccountModel } from '../models/AccountModel';
import { errorBody } from '../utils/error';

const accountsModel = AccountModel();
accountsModel.initialize();

export const AccountsRouter = () => {
  const router = new KoaRouter();

  router.put('/accounts', async (ctx) => {
    try {
      ctx.body = await accountsModel.insertOne(ctx.request.body);
      ctx.status = 200;
    } catch (error) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to insert account', error.message);
    }
  });

  // read
  router.get('/accounts', async (ctx) => {
    try {
      ctx.body = accountsModel.getAllRecords();
      ctx.status = 200;
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to update account', error.message);
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
    } catch (error) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to delete account', error.message);
    }
  });

  return router;
};
