import { AxiosError } from 'axios';

import { browserRequests, type LoggedRequest, nextRequestId, redactHeaders } from '@/utils/requestLog';

import axios from './axios';

export const catchCustomError = (error: AxiosError<{ name: string; message: string }>) => {
  const customError = new Error(error.response?.data?.message || error.message);
  customError.name = error.response?.data?.name || error.name;

  throw customError;
};

const PENDING_RETRY_MS = 2000;
const PENDING_MAX_ATTEMPTS = 15;

// Market data endpoints answer 202 when the data is being fetched but wasn't
// ready within the backend's deadline. Ask again until it is, so a card keeps
// its skeleton instead of rendering "no data" for something on its way.
export const getUntilReady = async <T>(url: string): Promise<T> => {
  for (let attempt = 1; ; attempt++) {
    const response = await axios.get<T>(url);
    if (response.status !== 202) return response.data;
    if (attempt >= PENDING_MAX_ATTEMPTS) throw new Error('Market data is still loading — try refreshing in a minute');
    await new Promise((resolve) => setTimeout(resolve, PENDING_RETRY_MS));
  }
};

const authHeader = (): Record<string, string> => {
  const token = sessionStorage.getItem('auth_token');
  const expires = Number(sessionStorage.getItem('auth_expires') ?? 0);
  return token && expires > Date.now() ? { Authorization: `Bearer ${token}` } : {};
};

type StreamOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
  /** Record the call in the request monitor. Off for the monitor's own stream. */
  log?: boolean;
};

// axios buffers whole responses in the browser, so long-lived NDJSON streams
// (agent replies, the server request tail) go through fetch instead.
export const streamNdjson = async <T>(
  url: string,
  onEvent: (event: T) => void,
  { method = 'GET', body, signal, log = true }: StreamOptions = {}
): Promise<void> => {
  const headers: Record<string, string> = {
    ...authHeader(),
    ...(body !== undefined && { 'Content-Type': 'application/json' }),
  };
  const entry: LoggedRequest = {
    id: nextRequestId(),
    direction: 'out',
    method,
    url,
    startedAt: Date.now(),
    requestHeaders: redactHeaders(headers),
    requestBody: body,
  };
  if (log) browserRequests.upsert(entry);
  const received: T[] = [];
  const finish = (patch: Partial<LoggedRequest>) => {
    if (log) browserRequests.upsert({ ...entry, endedAt: Date.now(), responseBody: received, ...patch });
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    finish({ error: message });
    throw err instanceof Error ? err : new Error(message);
  }

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => null);
    finish({ status: response.status, responseBody: data });
    if (response.status === 401) {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_expires');
      window.dispatchEvent(new Event('auth:locked'));
    }
    const error = new Error(data?.message || `Request failed with status ${response.status}`);
    error.name = data?.name || 'Error';
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffered = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });
      const lines = buffered.split('\n');
      buffered = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line) as T;
        if (log) received.push(event);
        onEvent(event);
      }
    }
    finish({ status: response.status });
  } catch (err) {
    finish({ status: response.status, error: err instanceof Error ? err.message : 'Stream failed' });
    throw err;
  }
};
