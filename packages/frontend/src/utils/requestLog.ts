export type RequestDirection = 'in' | 'out';

export interface LoggedRequest {
  id: string;
  direction: RequestDirection;
  method: string;
  url: string;
  startedAt: number;
  endedAt?: number;
  status?: number;
  error?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
}

const SECRET_HEADERS = ['authorization', 'cookie', 'x-api-key'];

export function redactHeaders(headers: unknown): Record<string, string> {
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

/** A ring buffer with a stable snapshot per change, for `useSyncExternalStore`. */
export class RequestStore {
  private entries: LoggedRequest[] = [];
  private listeners = new Set<() => void>();

  constructor(private readonly limit = 500) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.entries;

  upsert(entry: LoggedRequest) {
    const idx = this.entries.findIndex((e) => e.id === entry.id);
    const next = idx === -1 ? [...this.entries, entry] : this.entries.with(idx, entry);
    this.entries = next.length > this.limit ? next.slice(next.length - this.limit) : next;
    this.emit();
  }

  replaceAll(entries: LoggedRequest[]) {
    this.entries = entries.slice(-this.limit);
    this.emit();
  }

  clear() {
    this.entries = [];
    this.emit();
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }
}

/** Requests this browser made to the backend. Always recording, so opening the monitor shows what already happened. */
export const browserRequests = new RequestStore();

let seq = 0;
export const nextRequestId = () => `b-${Date.now().toString(36)}-${++seq}`;
