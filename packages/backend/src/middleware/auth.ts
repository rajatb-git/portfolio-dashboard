import crypto from 'node:crypto';
import type { Context, Next } from 'koa';
import { getLockStatus, getSessionSecret } from '../models/LockConfigModel';
import { errorBody } from '../utils/error';

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function sign(payload: string, secretHex: string): string {
  const key = Buffer.from(secretHex, 'hex');
  return base64url(crypto.createHmac('sha256', key).update(payload).digest());
}

export async function issueToken(ttlMs: number): Promise<{ token: string; expiresAt: number }> {
  const secret = await getSessionSecret();
  if (!secret) {
    throw new Error('Lock is not initialized');
  }
  const now = Date.now();
  const exp = now + ttlMs;
  const payload = { iat: now, exp };
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)));
  const signature = sign(payloadB64, secret);
  return { token: `${payloadB64}.${signature}`, expiresAt: exp };
}

export async function verifyToken(token: string): Promise<{ valid: boolean; expired?: boolean }> {
  if (!token || typeof token !== 'string') return { valid: false };
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };
  const [payloadB64, sig] = parts;
  const secret = await getSessionSecret();
  if (!secret) return { valid: false };
  const expectedSig = sign(payloadB64, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { valid: false };
  let payload: { iat: number; exp: number };
  try {
    payload = JSON.parse(base64urlDecode(payloadB64).toString('utf8'));
  } catch {
    return { valid: false };
  }
  if (typeof payload.exp !== 'number') return { valid: false };
  if (Date.now() >= payload.exp) return { valid: false, expired: true };
  return { valid: true };
}

function isExempt(ctx: Context): boolean {
  const path = ctx.path;
  if (path === '/health') return true;
  if (path.startsWith('/auth/')) return true;
  if (ctx.method === 'GET' && path === '/settings/lock') return true;
  return false;
}

export async function authMiddleware(ctx: Context, next: Next): Promise<void> {
  const status = await getLockStatus();
  if (!status.enabled || isExempt(ctx)) {
    await next();
    return;
  }
  const header = ctx.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) {
    ctx.status = 401;
    ctx.body = errorBody('Unauthorized', 'Authentication required');
    return;
  }
  const result = await verifyToken(m[1].trim());
  if (!result.valid) {
    ctx.status = 401;
    ctx.body = errorBody('Unauthorized', 'Authentication required');
    return;
  }
  await next();
}
