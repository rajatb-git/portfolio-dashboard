import { PassThrough } from 'node:stream';
import Router from '@koa/router';
import { type AgentEvent, runAgent, sanitizeMessages } from '../controller/AgentChatController';
import { getAiConfig } from '../models/AiConfigModel';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

const KEEPALIVE_MS = 15_000;

export const AgentRouter = () => {
  const router = new Router();

  router.get('/agent/status', async (ctx) => {
    try {
      const config = await getAiConfig();
      ctx.body = {
        available: config.enabled && config.provider === 'ollama',
        enabled: config.enabled,
        provider: config.provider,
        model: config.ollamaModel,
        host: config.ollamaHost,
      };
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Get agent status' });
      ctx.body = errorBody('Failed to get agent status', err.message);
      ctx.status = 500;
    }
  });

  router.post('/agent/chat', async (ctx) => {
    const { messages, approval } = (ctx.request as { body?: { messages?: unknown; approval?: unknown } }).body ?? {};
    let history: ReturnType<typeof sanitizeMessages>;
    try {
      history = sanitizeMessages(messages);
      if (approval !== undefined && approval !== 'approve' && approval !== 'deny') {
        throw new Error('approval must be "approve" or "deny"');
      }
    } catch (err: any) {
      ctx.body = errorBody('Invalid chat request', err.message);
      ctx.status = 400;
      return;
    }

    try {
      const stream = new PassThrough();
      let closed = false;
      const emit = (event: AgentEvent) => {
        if (!closed) stream.write(`${JSON.stringify(event)}\n`);
      };
      const keepalive = setInterval(() => emit({ type: 'ping' }), KEEPALIVE_MS);
      ctx.req.on('close', () => {
        closed = true;
      });

      runAgent(history, approval as 'approve' | 'deny' | undefined, ctx.headers.authorization, emit, () => closed)
        .catch((err: any) => {
          logger.log({ level: 'error', message: err.message, label: 'Agent chat' });
          emit({ type: 'error', message: err.message });
        })
        .finally(() => {
          clearInterval(keepalive);
          stream.end();
        });

      ctx.request.socket.setTimeout(0);
      ctx.set('Cache-Control', 'no-cache');
      ctx.set('X-Accel-Buffering', 'no');
      ctx.type = 'application/x-ndjson';
      ctx.status = 200;
      ctx.body = stream;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Agent chat' });
      ctx.body = errorBody('Failed to start agent chat', err.message);
      ctx.status = 500;
    }
  });

  return router;
};
