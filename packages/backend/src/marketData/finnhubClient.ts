import axios, { type AxiosResponse } from 'axios';
import { logger } from '../utils/winston';

// Every Finnhub REST call goes through here. The free plan allows
// FINN_HUB_RATE_LIMIT calls a minute and, on top of every plan, 30 a second.
//
// Two lanes share that budget:
//   user        — someone is waiting on the answer. Always served first.
//   background  — the refresh scheduler and jobs. Only served while
//                 the user reserve (FINN_HUB_INTERACTIVE_RESERVE) of the
//                 minute stays unspent, so a page the user opens never queues
//                 behind a background fan-out.
// Every request carries a deadline (`waitMs`). If the budget can't serve it in
// time it fails fast with FinnhubBusyError and the caller falls back to cached
// data, instead of a page hanging for the length of a rate-limit window.

export type Lane = 'user' | 'background';

export type RequestOptions = { lane?: Lane; waitMs?: number };

export class FinnhubBusyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FinnhubBusyError';
  }
}

const RATE_LIMIT = Number(process.env.FINN_HUB_RATE_LIMIT) || 60;
const BURST_LIMIT = Number(process.env.FINN_HUB_BURST_LIMIT) || 30;
const CONFIGURED_RESERVE = Number(process.env.FINN_HUB_INTERACTIVE_RESERVE) || 20;
const BURST_TARGET = Math.max(1, BURST_LIMIT - 5);

// Finnhub's x-ratelimit-limit header, when it reports less than configured —
// a key on a smaller allowance than FINN_HUB_RATE_LIMIT assumes.
let serverLimit: number | null = null;
const effectiveLimit = (): number => Math.min(RATE_LIMIT, serverLimit ?? RATE_LIMIT);

// Our sliding window and Finnhub's never line up exactly, so aim a little under
// the limit rather than at it. The user reserve shrinks with the limit so a
// smaller allowance still leaves the background lane room for quotes.
const sustainedTarget = (): number => Math.max(1, Math.floor(effectiveLimit() * 0.92));
const userReserve = (): number =>
  Math.min(sustainedTarget() - 1, Math.round((CONFIGURED_RESERVE * effectiveLimit()) / RATE_LIMIT));
const backgroundTarget = (): number => Math.max(1, sustainedTarget() - userReserve());

const WINDOW_MS = 60_000;
const BURST_WINDOW_MS = 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_WAIT_MS: Record<Lane, number> = { user: 3000, background: 0 };
// Finnhub's 429 carries no Retry-After; its own window is a minute.
const DEFAULT_429_PAUSE_MS = WINDOW_MS;
const STATS_WINDOW_MS = 60 * 60_000;

// 'external' marks calls Finnhub's headers say were made that we didn't see —
// another process on the same key, or calls from before a restart.
type DispatchLane = Lane | 'external';
type Dispatch = { at: number; lane: DispatchLane };

type Waiter = {
  lane: Lane;
  resolve: () => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout> | null;
};

const dispatchLog: Dispatch[] = [];
const queues: Record<Lane, Waiter[]> = { user: [], background: [] };
let pausedUntil = 0;
let pumpTimer: ReturnType<typeof setTimeout> | null = null;

// Identical paths share one request, queued or in flight.
const inFlight = new Map<string, { promise: Promise<any>; waiter: Waiter | null }>();

const rateLimitedAt: number[] = [];
const busyAt: Array<{ at: number; lane: Lane }> = [];
let lastHeaders: { limit: number; remaining: number; reset: number; at: string } | null = null;

const prune = (now: number): void => {
  while (dispatchLog.length && now - dispatchLog[0].at > WINDOW_MS) dispatchLog.shift();
  while (rateLimitedAt.length && now - rateLimitedAt[0] > STATS_WINDOW_MS) rateLimitedAt.shift();
  while (busyAt.length && now - busyAt[0].at > STATS_WINDOW_MS) busyAt.shift();
};

const burstCount = (now: number): number => {
  let count = 0;
  for (let i = dispatchLog.length - 1; i >= 0 && now - dispatchLog[i].at <= BURST_WINDOW_MS; i--) count++;
  return count;
};

// How long a request on this lane must wait before it may go out. Zero is now.
const waitFor = (lane: Lane, now: number): number => {
  prune(now);
  let wait = Math.max(0, pausedUntil - now);

  // The background cap counts every call in the window, whoever made it, which
  // is what keeps the user reserve free.
  const cap = lane === 'user' ? sustainedTarget() : backgroundTarget();
  if (dispatchLog.length >= cap) {
    wait = Math.max(wait, dispatchLog[dispatchLog.length - cap].at + WINDOW_MS - now);
  }

  if (burstCount(now) >= BURST_TARGET) {
    wait = Math.max(wait, dispatchLog[dispatchLog.length - BURST_TARGET].at + BURST_WINDOW_MS - now);
  }

  return wait;
};

const dispatch = (waiter: Waiter, now: number): void => {
  if (waiter.timer) clearTimeout(waiter.timer);
  dispatchLog.push({ at: now, lane: waiter.lane });
  waiter.resolve();
};

// Serves the user queue first, then background only once no user request is
// waiting, then sleeps until the next slot frees.
const pump = (): void => {
  if (pumpTimer) {
    clearTimeout(pumpTimer);
    pumpTimer = null;
  }

  for (const lane of ['user', 'background'] as const) {
    const queue = queues[lane];
    while (queue.length) {
      const now = Date.now();
      const wait = waitFor(lane, now);
      if (wait > 0) {
        pumpTimer = setTimeout(pump, wait);
        return;
      }
      dispatch(queue.shift() as Waiter, now);
    }
  }
};

const busy = (lane: Lane, message: string): FinnhubBusyError => {
  busyAt.push({ at: Date.now(), lane });
  return new FinnhubBusyError(message);
};

const acquire = (lane: Lane, waitMs: number, onQueued: (waiter: Waiter) => void): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const waiter: Waiter = { lane, resolve, reject, timer: null };
    const now = Date.now();
    const ahead = lane === 'user' ? queues.user.length : queues.user.length + queues.background.length;

    if (ahead === 0 && waitFor(lane, now) === 0) {
      dispatch(waiter, now);
      return;
    }
    if (waitMs <= 0) {
      reject(busy(lane, 'Finnhub budget is fully used right now'));
      return;
    }

    waiter.timer = setTimeout(() => {
      const queue = queues[waiter.lane];
      const index = queue.indexOf(waiter);
      if (index >= 0) queue.splice(index, 1);
      reject(busy(waiter.lane, `Finnhub budget could not serve this within ${waitMs}ms`));
    }, waitMs);
    queues[lane].push(waiter);
    onQueued(waiter);
    pump();
  });

// A user request for a path a background job already queued shouldn't wait
// behind the background lane.
const promote = (waiter: Waiter): void => {
  if (waiter.lane !== 'background') return;
  const index = queues.background.indexOf(waiter);
  if (index < 0) return;
  queues.background.splice(index, 1);
  waiter.lane = 'user';
  queues.user.push(waiter);
  pump();
};

const headerNumber = (value: unknown): number | null => {
  const n = Number(value);
  return value !== undefined && value !== null && value !== '' && Number.isFinite(n) ? n : null;
};

// Finnhub reports what it has counted against the key. When that is more than
// we have recorded, record the difference so our window matches theirs.
const syncFromHeaders = (headers: Record<string, any> | undefined): void => {
  const limit = headerNumber(headers?.['x-ratelimit-limit']);
  const remaining = headerNumber(headers?.['x-ratelimit-remaining']);
  const reset = headerNumber(headers?.['x-ratelimit-reset']);
  if (limit === null || remaining === null) return;

  const now = Date.now();
  lastHeaders = { limit, remaining, reset: reset ?? 0, at: new Date(now).toISOString() };
  if (limit > 0 && limit < RATE_LIMIT) serverLimit = limit;
  prune(now);

  const serverUsed = Math.min(RATE_LIMIT, limit - remaining);
  for (let missing = serverUsed - dispatchLog.length; missing > 0; missing--) {
    dispatchLog.push({ at: now, lane: 'external' });
  }

  if (remaining <= 0) {
    pausedUntil = Math.max(pausedUntil, reset !== null ? reset * 1000 + 250 : now + DEFAULT_429_PAUSE_MS);
  }
};

const send = async <T>(path: string): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await axios.get<T>(process.env.FINN_HUB_API + path, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: { 'X-Finnhub-Token': process.env.FINN_HUB_API_KEY, 'Content-Type': 'application/json' },
    });
    syncFromHeaders(response.headers as Record<string, any>);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      syncFromHeaders(error.response?.headers as Record<string, any> | undefined);
      if (error.response?.status === 429) {
        // Retrying inside the window only spends more calls on more 429s, so
        // stop everything until Finnhub's window rolls over.
        const now = Date.now();
        const reset = headerNumber(error.response.headers?.['x-ratelimit-reset']);
        pausedUntil = Math.max(pausedUntil, reset !== null ? reset * 1000 + 250 : now + DEFAULT_429_PAUSE_MS);
        rateLimitedAt.push(now);
        logger.log({
          level: 'warn',
          label: 'Finnhub rate limit',
          message: `429 on ${path.split('?')[0]}; pausing all calls for ${Math.round((pausedUntil - now) / 1000)}s`,
        });
        throw new FinnhubBusyError('Finnhub rate limit reached — paused until its window resets');
      }
    }
    throw error;
  }
};

export const finnhubGet = <T = any>(path: string, options: RequestOptions = {}): Promise<T> => {
  const lane = options.lane ?? 'user';
  const waitMs = options.waitMs ?? DEFAULT_WAIT_MS[lane];

  const existing = inFlight.get(path);
  if (existing) {
    if (lane === 'user' && existing.waiter) promote(existing.waiter);
    return existing.promise;
  }

  const entry: { promise: Promise<T>; waiter: Waiter | null } = { promise: Promise.resolve() as any, waiter: null };
  entry.promise = acquire(lane, waitMs, (waiter) => {
    entry.waiter = waiter;
  })
    .then(() => {
      entry.waiter = null;
      return send<T>(path);
    })
    .finally(() => {
      inFlight.delete(path);
    });
  inFlight.set(path, entry);
  return entry.promise;
};

// How many background calls could go out right now without waiting — the
// scheduler dispatches at most this many per tick.
export const backgroundHeadroom = (): number => {
  const now = Date.now();
  if (queues.user.length || queues.background.length || waitFor('background', now) > 0) return 0;
  return Math.max(0, Math.min(backgroundTarget() - dispatchLog.length, BURST_TARGET - burstCount(now)));
};

export const finnhubStats = () => {
  const now = Date.now();
  prune(now);
  const used = { user: 0, background: 0, external: 0 };
  for (const d of dispatchLog) used[d.lane]++;
  return {
    limits: {
      perMinute: effectiveLimit(),
      configuredPerMinute: RATE_LIMIT,
      perSecond: BURST_LIMIT,
      sustainedTarget: sustainedTarget(),
      burstTarget: BURST_TARGET,
      userReserve: userReserve(),
      backgroundTarget: backgroundTarget(),
    },
    lastMinute: { ...used, total: dispatchLog.length },
    queued: { user: queues.user.length, background: queues.background.length },
    pausedForSec: pausedUntil > now ? Math.ceil((pausedUntil - now) / 1000) : 0,
    lastHour: {
      rateLimited: rateLimitedAt.length,
      busyRejections: {
        user: busyAt.filter((b) => b.lane === 'user').length,
        background: busyAt.filter((b) => b.lane === 'background').length,
      },
    },
    lastHeaders,
  };
};
