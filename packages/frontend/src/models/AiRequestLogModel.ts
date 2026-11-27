export interface IAiRequestLog {
  id: string;
  createdAt: string;
  feature: string;
  provider: string;
  model: string;
  host: string;
  status: 'success' | 'error';
  systemPrompt: string;
  userPrompt: string;
  response: string;
  thinking: string;
  error: string;
  durationMs: number;
  loadMs?: number;
  promptEvalMs?: number;
  evalMs?: number;
  promptTokens?: number;
  responseTokens?: number;
  options: string;
}
