import { DB_HOST } from '@/config';

const BODY_LIMIT = 40_000;

export function formatBody(body: unknown): string {
  if (body == null || body === '') return '';
  let text: string;
  if (typeof body === 'string') {
    try {
      text = JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      text = body;
    }
  } else if (body instanceof FormData) {
    text = `FormData: ${[...body.keys()].join(', ')}`;
  } else if (body instanceof Blob) {
    text = `<${body.size} bytes of ${body.type || 'binary'}>`;
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

/** Backend calls read as paths; anything else keeps its host so Finnhub and NASDAQ are told apart. */
export function displayUrl(url: string): string {
  if (url.startsWith(DB_HOST)) return url.slice(DB_HOST.length) || '/';
  return url.replace(/^https?:\/\//, '');
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

const LOCAL_HOST =
  /^(localhost|127\.|0\.0\.0\.0|\[?::1\]?|host\.docker\.internal|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|[^.]+$|.+\.local$)/i;

/** Whether an Ollama URL points at this machine or the local network, rather than a server elsewhere. */
export function isLocalHost(url: string): boolean {
  try {
    return LOCAL_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}
