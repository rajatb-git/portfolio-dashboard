import Router from '@koa/router';
import { recordCashMovement } from '../controller/CashController';
import { ACCOUNT_TAX_TYPES, AccountModel } from '../models/AccountModel';
import { HoldingsModel } from '../models/HoldingsModel';
import { TransactionModel } from '../models/TransactionModel';
import { normalizeTradeDate } from '../utils';
import { errorBody } from '../utils/error';
import { DuplicateIdError, RecordNotFoundError } from '../utils/mongoModel';
import { logger } from '../utils/winston';

const MAX_ACCOUNT_NAME = 50;

const accountIdFromName = (name: string) => name.replace(/[^A-Za-z0-9_-]/g, '');

export const AccountsRouter = () => {
  const router = new Router();

  router.put('/accounts', async (ctx) => {
    try {
      const accountsModel = await AccountModel().initialize();
      const body: any = ctx.request.body;
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      if (!name || name.length > MAX_ACCOUNT_NAME) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid account name', `Account name is required (max ${MAX_ACCOUNT_NAME} characters)`);
        return;
      }
      const id = body.id || accountIdFromName(name);
      if (!id) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid account name', 'Account name must contain at least one letter or number');
        return;
      }
      ctx.body = await accountsModel.insertOne({ ...body, name }, id);
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Insert account' });
      if (error instanceof DuplicateIdError) {
        ctx.status = 400;
        ctx.body = errorBody('Failed to insert account', 'An account with this name already exists');
        return;
      }
      ctx.status = 500;
      ctx.body = errorBody('Failed to insert account', error.message);
    }
  });

  // read
  router.get('/accounts', async (ctx) => {
    try {
      const accountsModel = await AccountModel().initialize();
      ctx.body = accountsModel.getAllRecords();
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Get accounts' });
      ctx.status = 500;
      ctx.body = errorBody('Failed to get accounts', error.message);
    }
  });

  router.get('/accounts/:id', async (ctx) => {
    try {
      const accountsModel = await AccountModel().initialize();
      if (ctx.params.id) {
        const account = accountsModel.findById(ctx.params.id);
        if (!account) {
          ctx.status = 404;
          ctx.body = errorBody('Account not found', `Account ${ctx.params.id} not found`);
          return;
        }
        ctx.body = account;
        ctx.status = 200;
        return;
      }
      ctx.status = 400;
      ctx.body = errorBody('Account ID is required', 'Account ID is required');
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: `Get account "${ctx.params.id}"` });
      ctx.status = 500;
      ctx.body = errorBody('Failed to get account', error.message);
    }
  });

  // update
  router.post('/accounts', async (ctx) => {
    try {
      const accountsModel = await AccountModel().initialize();
      const body: any = ctx.request.body;
      if (!body?.id) {
        ctx.status = 400;
        ctx.body = errorBody('Account ID is required', 'Account ID is required');
        return;
      }
      if (body.name !== undefined) {
        body.name = String(body.name).trim();
        if (!body.name || body.name.length > MAX_ACCOUNT_NAME) {
          ctx.status = 400;
          ctx.body = errorBody('Invalid account name', `Name must be 1-${MAX_ACCOUNT_NAME} characters`);
          return;
        }
      }
      if (body.taxType !== undefined && !ACCOUNT_TAX_TYPES.includes(body.taxType)) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid tax type', `taxType must be one of ${ACCOUNT_TAX_TYPES.join(', ')}`);
        return;
      }
      ctx.body = await accountsModel.insertOrUpdate(body, body.id);
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'Update account' });
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

      const result = await recordCashMovement(ctx.params.id, amount, action, normalizeTradeDate(body?.date));
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
      const accountsModel = await AccountModel().initialize();
      if (ctx.params.id) {
        await accountsModel.deleteById(ctx.params.id);
        // Its holdings and history go with it: left behind they still counted in
        // every total, under an account nothing could trade into or remove.
        const [holdingsModel, txModel] = await Promise.all([
          HoldingsModel().initialize(),
          TransactionModel().initialize(),
        ]);
        const holdings = holdingsModel.find({ accountId: ctx.params.id });
        const transactions = txModel.find({ accountId: ctx.params.id });
        for (const h of holdings) await holdingsModel.deleteById(h.id);
        for (const t of transactions) await txModel.deleteById(t.id);
        ctx.status = 200;
        ctx.body = {
          message: `Account deleted with ${holdings.length} holding(s) and ${transactions.length} transaction(s)`,
        };
        return;
      }
      ctx.status = 400;
      ctx.body = errorBody('Account ID is required', 'Account ID is required');
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: `Delete account "${ctx.params.id}"` });
      if (error instanceof RecordNotFoundError) {
        ctx.status = 404;
        ctx.body = errorBody('Account not found', `Account ${ctx.params.id} not found`);
        return;
      }
      ctx.status = 500;
      ctx.body = errorBody('Failed to delete account', error.message);
    }
  });

  return router;
};
