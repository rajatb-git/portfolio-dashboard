import Router from '@koa/router';
import {
  NotificationHistoryDBModel,
  pruneNotificationHistory,
} from '../models/NotificationHistoryModel';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export const NotificationsRouter = () => {
  const router = new Router();

  // Newest first, optionally narrowed to one kind.
  router.get('/notifications/history', async (ctx) => {
    try {
      const rawLimit = Number(ctx.query.limit ?? DEFAULT_LIMIT);
      const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, rawLimit), MAX_LIMIT) : DEFAULT_LIMIT;
      const kind = typeof ctx.query.kind === 'string' ? ctx.query.kind : '';

      const model = await NotificationHistoryDBModel().initialize();
      const records = model
        .getAllRecords()
        .filter((rec) => !kind || rec.kind === kind)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      ctx.body = { total: records.length, items: records.slice(0, limit) };
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Get notification history' });
      ctx.status = 500;
      ctx.body = errorBody('Failed to get notification history', err.message);
    }
  });

  router.delete('/notifications/history', async (ctx) => {
    try {
      const model = await NotificationHistoryDBModel().initialize();
      const count = model.countAll();
      await model.deleteAll();
      ctx.body = { deleted: count };
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Clear notification history' });
      ctx.status = 500;
      ctx.body = errorBody('Failed to clear notification history', err.message);
    }
  });

  // Drop records past the retention window without waiting for the next write.
  router.post('/notifications/history/prune', async (ctx) => {
    try {
      ctx.body = { pruned: await pruneNotificationHistory() };
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Prune notification history' });
      ctx.status = 500;
      ctx.body = errorBody('Failed to prune notification history', err.message);
    }
  });

  return router;
};
