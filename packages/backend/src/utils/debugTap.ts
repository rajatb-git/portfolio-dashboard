import { EventEmitter } from 'node:events';
import axios, { type InternalAxiosRequestConfig } from 'axios';
import type { Context, Next } from 'koa';

export type TapDirection = 'in' | 'out';

export interface TapEntry {
  id: string;
  direction: TapDirection;
  method: string;
  url: string;
  startedAt: number;
  endedAt?: number;
  status?: number;
  error?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
}

const BUFFER_SIZE = 300;
const BODY_LIMIT = 64_000;
const SECRET_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-finnhub-token', 'x-goog-api-key'];
const SECRET_PARAMS = ['token', 'apikey', 'api_key', 'key', 'access_token'];

const buffer: TapEntry[] = [];
const bus = new EventEmitter();
bus.setMaxListeners(50);
let seq = 0;

function nextId(direction: TapDirection): string {
  seq += 1;
  return `${direction}-${Date.now().toString(36)}-${seq}`;
}

function publish(entry: TapEntry): void {
  const idx = buffer.findIndex((e) => e.id === entry.id);
  if (idx === -1) {
    buffer.push(entry);
    if (buffer.length > BUFFER_SIZE) buffer.shift();
  } else {
    buffer[idx] = entry;
  }
  bus.emit('entry', entry);
}

export function redactUrl(raw: string): string {
  try {
    const url = new URL(raw, 'http://local');
    for (const param of SECRET_PARAMS) {
      if (url.searchParams.has(param)) url.searchParams.set(param, '•••');
    }
    return raw.startsWith('/') ? `${url.pathname}${url.search}` : url.toString();
  } catch {
    return raw;
  }
}

function headerRecord(headers: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers || typeof headers !== 'object') return out;
  const source =
    typeof (headers as { toJSON?: () => unknown }).toJSON === 'function'
      ? ((headers as { toJSON: () => unknown }).toJSON() as Record<string, unknown>)
      : (headers as Record<string, unknown>);
  for (const [name, value] of Object.entries(source)) {
    if (value == null || typeof value === 'object') continue;
    out[name] = SECRET_HEADERS.includes(name.toLowerCase()) ? '•••' : String(value);
  }
  return out;
}

function bodyText(body: unknown): string | undefined {
  if (body == null || body === '') return undefined;
  if (Buffer.isBuffer(body)) return `<${body.length} bytes of binary>`;
  if (typeof (body as { pipe?: unknown }).pipe === 'function') return '<stream>';
  let text: string;
  if (typeof body === 'string') {
    text = body;
  } else {
    try {
      text = JSON.stringify(body, null, 2);
    } catch {
      text = String(body);
    }
  }
  return text.length > BODY_LIMIT
    ? `${text.slice(0, BODY_LIMIT)}\n… ${text.length - BODY_LIMIT} more characters`
    : text;
}

export function tapSnapshot(): TapEntry[] {
  return [...buffer];
}

export function onTapEntry(listener: (entry: TapEntry) => void): () => void {
  bus.on('entry', listener);
  return () => bus.off('entry', listener);
}

const tapIds = new WeakMap<InternalAxiosRequestConfig, TapEntry>();

function fullUrl(config: InternalAxiosRequestConfig): string {
  const base = config.baseURL ?? '';
  const url = `${base}${config.url ?? ''}`;
  if (!config.params) return url;
  const query = new URLSearchParams(
    Object.entries(config.params as Record<string, unknown>)
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return query ? `${url}${url.includes('?') ? '&' : '?'}${query}` : url;
}

// Every external API module uses the default axios instance, so one pair of
// interceptors sees all outbound traffic (Finnhub, NASDAQ, Ollama, the agent).
export function installOutboundTap(): void {
  axios.interceptors.request.use((config) => {
    const entry: TapEntry = {
      id: nextId('out'),
      direction: 'out',
      method: (config.method ?? 'get').toUpperCase(),
      url: redactUrl(fullUrl(config)),
      startedAt: Date.now(),
      requestHeaders: headerRecord(config.headers),
      requestBody: bodyText(config.data),
    };
    tapIds.set(config, entry);
    publish(entry);
    return config;
  });
  axios.interceptors.response.use(
    (response) => {
      const entry = tapIds.get(response.config);
      if (entry) {
        publish({
          ...entry,
          endedAt: Date.now(),
          status: response.status,
          responseHeaders: headerRecord(response.headers),
          responseBody: bodyText(response.data),
        });
      }
      return response;
    },
    (error) => {
      const entry = error?.config ? tapIds.get(error.config) : undefined;
      if (entry) {
        publish({
          ...entry,
          endedAt: Date.now(),
          status: error.response?.status,
          error: error.message,
          responseHeaders: headerRecord(error.response?.headers),
          responseBody: bodyText(error.response?.data),
        });
      }
      return Promise.reject(error);
    }
  );
}

export async function inboundTap(ctx: Context, next: Next): Promise<void> {
  // The monitor's own stream would otherwise log itself forever.
  if (ctx.path.startsWith('/debug/') || ctx.method === 'OPTIONS') {
    await next();
    return;
  }
  const entry: TapEntry = {
    id: nextId('in'),
    direction: 'in',
    method: ctx.method,
    url: redactUrl(ctx.url),
    startedAt: Date.now(),
    requestHeaders: headerRecord(ctx.headers),
    requestBody: bodyText((ctx.request as { body?: unknown }).body),
  };
  publish(entry);
  try {
    await next();
    publish({
      ...entry,
      endedAt: Date.now(),
      status: ctx.status,
      responseHeaders: headerRecord(ctx.response.headers),
      responseBody: bodyText(ctx.body),
    });
  } catch (err: any) {
    publish({ ...entry, endedAt: Date.now(), status: 500, error: err?.message });
    throw err;
  }
}
