import { PassThrough } from 'node:stream';
import Router from '@koa/router';
import { onTapEntry, tapSnapshot } from '../utils/debugTap';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

const KEEPALIVE_MS = 15_000;

export const DebugRouter = () => {
  const router = new Router();

  router.get('/debug/requests', async (ctx) => {
    try {
      ctx.body = tapSnapshot();
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Get debug requests' });
      ctx.body = errorBody('Failed to get requests', err.message);
      ctx.status = 500;
    }
  });

  // NDJSON rather than SSE: the browser reads it with fetch, which can send
  // the Authorization header that EventSource cannot.
  router.get('/debug/requests/stream', async (ctx) => {
    try {
      const stream = new PassThrough();
      const write = (payload: unknown) => stream.write(`${JSON.stringify(payload)}\n`);

      write({ type: 'snapshot', entries: tapSnapshot() });
      const unsubscribe = onTapEntry((entry) => write({ type: 'entry', entry }));
      const keepalive = setInterval(() => write({ type: 'ping' }), KEEPALIVE_MS);

      const close = () => {
        clearInterval(keepalive);
        unsubscribe();
        stream.end();
      };
      ctx.req.on('close', close);

      ctx.request.socket.setTimeout(0);
      ctx.set('Cache-Control', 'no-cache');
      ctx.set('X-Accel-Buffering', 'no');
      ctx.type = 'application/x-ndjson';
      ctx.status = 200;
      ctx.body = stream;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Stream debug requests' });
      ctx.body = errorBody('Failed to stream requests', err.message);
      ctx.status = 500;
    }
  });

  return router;
};
