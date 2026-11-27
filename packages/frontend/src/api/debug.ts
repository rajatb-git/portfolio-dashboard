import { DB_HOST } from '@/config';
import type { LoggedRequest } from '@/utils/requestLog';

import { streamNdjson } from './apiUtil';

export type ServerTapEvent =
  | { type: 'snapshot'; entries: LoggedRequest[] }
  | { type: 'entry'; entry: LoggedRequest }
  | { type: 'ping' };

export default class DebugAPI {
  streamServerRequests = async (onEvent: (event: ServerTapEvent) => void, signal: AbortSignal): Promise<void> =>
    streamNdjson<ServerTapEvent>(DB_HOST + '/debug/requests/stream', onEvent, { signal, log: false });
}
