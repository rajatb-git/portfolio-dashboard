import { DB_HOST } from '@/config';

import { catchCustomError, streamNdjson } from './apiUtil';
import axios from './axios';

export type AgentToolCall = { function: { name: string; arguments: Record<string, unknown> } };

export type AgentMessage = {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: AgentToolCall[];
  tool_name?: string;
};

export type AgentEvent =
  | { type: 'message'; message: AgentMessage }
  | { type: 'approval'; call: AgentToolCall }
  | { type: 'done' }
  | { type: 'error'; message: string }
  | { type: 'ping' };

export type AgentStatus = {
  available: boolean;
  enabled: boolean;
  provider: 'claude' | 'gemini' | 'ollama';
  model: string;
  host: string;
};

export default class AgentAPI {
  getStatus = async (): Promise<AgentStatus> =>
    axios(DB_HOST + '/agent/status')
      .then((response) => response.data)
      .catch(catchCustomError);

  chat = async (
    body: { messages: AgentMessage[]; approval?: 'approve' | 'deny' },
    onEvent: (event: AgentEvent) => void,
    signal: AbortSignal
  ): Promise<void> => streamNdjson<AgentEvent>(DB_HOST + '/agent/chat', onEvent, { method: 'POST', body, signal });
}
