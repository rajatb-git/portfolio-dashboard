import Router from '@koa/router';
import type { SkewerModel } from 'skewer-db';
import { AccountModel } from '../models/AccountModel';
import { AlertModel } from '../models/AlertModel';
import { HoldingsModel } from '../models/HoldingsModel';
import { NoteModel } from '../models/NoteModel';
import { PortfolioSnapshotDBModel } from '../models/PortfolioSnapshotModel';
import { TransactionModel } from '../models/TransactionModel';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

// Allowlist of collections exposed on the Database page. Config and cached
// market-data collections are intentionally excluded — config is managed via
// Settings, and caches are not user data.
const userCollections: { [name: string]: () => Promise<SkewerModel<any>> } = {
  accounts: () => AccountModel().initialize(),
  holdings: () => HoldingsModel().initialize(),
  transactions: () => TransactionModel().initialize(),
  alerts: () => AlertModel().initialize(),
  notes: () => NoteModel().initialize(),
  portfolio_snapshots: () => PortfolioSnapshotDBModel().initialize(),
};

const resolveCollection = (name: string) =>
  Object.prototype.hasOwnProperty.call(userCollections, name) ? userCollections[name]() : null;

export const DatabaseRouter = () => {
  const router = new Router();

  router.get('/database/:collection', async (ctx) => {
    const { collection } = ctx.params;
    try {
      const model = await resolveCollection(collection);
      if (!model) {
        ctx.status = 400;
        ctx.body = errorBody('Unknown collection', `"${collection}" is not a manageable collection`);
        return;
      }
      ctx.body = model.getAllRecords();
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get records "${collection}"` });
      ctx.status = 500;
      ctx.body = errorBody('Failed to get records', err.message);
    }
  });

  router.delete('/database/:collection/:id', async (ctx) => {
    const { collection, id } = ctx.params;
    try {
      const model = await resolveCollection(collection);
      if (!model) {
        ctx.status = 400;
        ctx.body = errorBody('Unknown collection', `"${collection}" is not a manageable collection`);
        return;
      }
      await model.deleteById(id);
      ctx.body = { deleted: id };
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Delete record "${collection}/${id}"` });
      ctx.status = 400;
      ctx.body = errorBody('Failed to delete record', err.message);
    }
  });

  router.delete('/database/:collection', async (ctx) => {
    const { collection } = ctx.params;
    try {
      const model = await resolveCollection(collection);
      if (!model) {
        ctx.status = 400;
        ctx.body = errorBody('Unknown collection', `"${collection}" is not a manageable collection`);
        return;
      }
      const count = model.countAll();
      await model.deleteAll();
      ctx.body = { flushed: collection, deletedCount: count };
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Flush collection "${collection}"` });
      ctx.status = 500;
      ctx.body = errorBody('Failed to flush collection', err.message);
    }
  });

  return router;
};
