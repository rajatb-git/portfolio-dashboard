import Router from '@koa/router';

import { getMongoDb } from '../utils/mongoClient';

export const HealthRouter = () => {
  const router = new Router();

  router.get('/health', async (ctx) => {
    try {
      const db = await getMongoDb();
      await db.command({ ping: 1 });
      ctx.body = { status: 'ok', mongo: 'connected' };
      ctx.status = 200;
    } catch (err: any) {
      ctx.body = { status: 'degraded', mongo: 'disconnected', error: err.message };
      ctx.status = 503;
    }
  });

  return router;
};
