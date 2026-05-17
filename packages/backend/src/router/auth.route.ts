import KoaRouter from 'koa-router';
import { issueToken } from '../middleware/auth';
import { getLockStatus, verifyCode } from '../models/LockConfigModel';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

type RateState = { attempts: number; windowStart: number; lockedUntil: number };

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60_000;
const DEFAULT_TTL_MS = 24 * 60 * 60_000;

const rateMap = new Map<string, RateState>();

function getRateState(ip: string): RateState {
  const existing = rateMap.get(ip);
  if (existing) return existing;
  const fresh: RateState = { attempts: 0, windowStart: Date.now(), lockedUntil: 0 };
  rateMap.set(ip, fresh);
  return fresh;
}

export const AuthRouter = () => {
  const router = new KoaRouter();

  router.get('/auth/status', async (ctx) => {
    try {
      const status = await getLockStatus();
      ctx.body = { enabled: status.enabled };
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'auth status' });
      ctx.status = 500;
      ctx.body = errorBody('Failed to get auth status', err.message);
    }
  });

  router.post('/auth/unlock', async (ctx) => {
    const ip = ctx.ip || 'unknown';
    try {
      const state = getRateState(ip);
      const now = Date.now();
      if (state.lockedUntil > now) {
        const secs = Math.ceil((state.lockedUntil - now) / 1000);
        ctx.status = 429;
        ctx.body = errorBody('Too many attempts', `Try again in ${secs} seconds`);
        return;
      }
      if (now - state.windowStart > WINDOW_MS) {
        state.attempts = 0;
        state.windowStart = now;
      }

      const body = (ctx.request.body || {}) as { code?: string };
      const code = typeof body.code === 'string' ? body.code : '';

      const status = await getLockStatus();
      if (!status.enabled) {
        ctx.status = 400;
        ctx.body = errorBody('Lock disabled', 'Lock is not enabled');
        return;
      }

      const ok = code.length === 6 && /^\d{6}$/.test(code) && (await verifyCode(code));
      if (!ok) {
        state.attempts += 1;
        logger.log({ level: 'warn', message: `unlock failed from ${ip}`, label: 'auth' });
        if (state.attempts > MAX_ATTEMPTS) {
          state.lockedUntil = now + LOCKOUT_MS;
          const secs = Math.ceil(LOCKOUT_MS / 1000);
          ctx.status = 429;
          ctx.body = errorBody('Too many attempts', `Try again in ${secs} seconds`);
          return;
        }
        ctx.status = 401;
        ctx.body = errorBody('Invalid code', 'The code is incorrect');
        return;
      }

      state.attempts = 0;
      state.lockedUntil = 0;
      const ttlMs = status.idleTimeoutMinutes > 0 ? status.idleTimeoutMinutes * 60_000 : DEFAULT_TTL_MS;
      const { token, expiresAt } = await issueToken(ttlMs);
      ctx.body = { token, expiresAt };
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'auth unlock' });
      ctx.status = 500;
      ctx.body = errorBody('Unlock failed', err.message);
    }
  });

  router.post('/auth/lock', async (ctx) => {
    try {
      ctx.status = 204;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'auth lock' });
      ctx.status = 500;
      ctx.body = errorBody('Lock failed', err.message);
    }
  });

  return router;
};
