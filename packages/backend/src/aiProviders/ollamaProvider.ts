import axios from 'axios';
import { recordAiRequest } from '../models/AiRequestLogModel';
import { logger } from '../utils/winston';
import { AiProvider, InsightMeta } from './types';

export type OllamaToolCall = { function: { name: string; arguments: Record<string, unknown> } };

export type OllamaChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: OllamaToolCall[];
  tool_name?: string;
};

export type OllamaOptions = {
  think?: boolean;
  numCtx?: number;
  keepAlive?: string;
  temperature?: number | null;
  timeoutMs?: number;
};

export type OllamaChatResult = {
  message: OllamaChatMessage;
  promptTokens?: number;
  numCtx: number;
};

export type OllamaModelInfo = {
  model: string;
  contextLength?: number;
  capabilities: string[];
  parameterSize?: string;
  quantization?: string;
};

export type OllamaTool = {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

function normalizeHost(host: string): string {
  return host
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(api\/chat|api\/generate)$/i, '');
}

function describeOllamaError(err: unknown, url: string, model: string): string {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : `Ollama request to ${url} failed.`;
  }

  const status = err.response?.status;
  if (status === 405) {
    return `Ollama request to ${url} returned 405 (Method Not Allowed). The Host does not look like an Ollama API server — point it at Ollama's base URL (e.g. http://localhost:11434), not a reverse proxy or web UI.`;
  }
  if (status === 404) {
    return `Ollama request to ${url} returned 404. Verify the Host URL, and make sure the model "${model}" is pulled ("ollama pull ${model}").`;
  }
  if (typeof status === 'number') {
    const detail =
      err.response?.data && typeof err.response.data === 'object'
        ? (err.response.data as { error?: string }).error
        : undefined;
    return `Ollama request to ${url} failed with status ${status}${detail ? `: ${detail}` : ''}.`;
  }
  // A request that hit our own timeout reached Ollama; it was just slow.
  if (err.code === 'ECONNABORTED' && /timeout/i.test(err.message)) {
    return `The local model "${model}" took too long to answer (${err.message}). It may be too slow on this machine for the amount of text — try a smaller document or a faster model.`;
  }
  if (
    err.code === 'ECONNREFUSED' ||
    err.code === 'ECONNABORTED' ||
    err.code === 'ETIMEDOUT' ||
    err.code === 'ENOTFOUND'
  ) {
    return `Could not reach Ollama at ${url} (${err.code}). Ensure Ollama is running and reachable from the server. When the app runs in Docker, use http://host.docker.internal:11434 instead of localhost.`;
  }
  return `Ollama request to ${url} failed: ${err.message}`;
}

const nsToMs = (ns: unknown) => (typeof ns === 'number' ? Math.round(ns / 1e6) : undefined);

// Reasoning models that don't use Ollama's `thinking` field inline their
// reasoning as <think>…</think>; split it out so callers still get bare JSON.
function splitInlineThinking(content: string): { content: string; thinking: string } {
  const blocks = [...content.matchAll(/<think>([\s\S]*?)<\/think>/gi)].map((m) => m[1].trim());
  if (!blocks.length) return { content, thinking: '' };
  return { content: content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim(), thinking: blocks.join('\n\n') };
}

export class OllamaProvider implements AiProvider {
  readonly name = 'ollama' as const;
  readonly model: string;
  private host: string;
  private think: boolean;
  private numCtx: number;
  private keepAlive: string;
  private temperature: number | null;
  private timeoutMs: number;

  constructor(host?: string, model?: string, options: OllamaOptions = {}) {
    this.host = normalizeHost(host || 'http://localhost:11434');
    this.model = model || 'llama3.1';
    this.think = options.think ?? false;
    this.numCtx = options.numCtx ?? 16384;
    this.keepAlive = options.keepAlive ?? '30m';
    this.temperature = options.temperature ?? null;
    this.timeoutMs = options.timeoutMs ?? 180000;
  }

  /** A caller that needs more room (statement imports) can ask for it; nobody gets less than the configured window. */
  private requestTuning(tuning: { numCtx?: number; timeoutMs?: number }) {
    const numCtx = Math.max(this.numCtx, tuning.numCtx ?? 0);
    const timeoutMs = Math.max(this.timeoutMs, tuning.timeoutMs ?? 0);
    const body = {
      keep_alive: this.keepAlive,
      options: { num_ctx: numCtx, ...(this.temperature !== null && { temperature: this.temperature }) },
    };
    return { numCtx, timeoutMs, body };
  }

  isConfigured(): boolean {
    return this.host.length > 0;
  }

  // `numCtx` raises Ollama's context window (2–4K tokens by default, beyond
  // which input is silently cut) for long inputs such as statement imports.
  async generateInsight(
    systemPrompt: string,
    userPrompt: string,
    meta: InsightMeta = { feature: 'unknown' },
    tuning: { numCtx?: number; timeoutMs?: number } = {}
  ): Promise<string> {
    const url = `${this.host}/api/chat`;
    const { numCtx, timeoutMs, body } = this.requestTuning(tuning);
    const startedAt = Date.now();
    const log = {
      feature: meta.feature,
      provider: this.name,
      model: this.model,
      host: this.host,
      systemPrompt,
      userPrompt,
      options: JSON.stringify({
        think: this.think,
        numCtx,
        timeoutMs,
        keepAlive: this.keepAlive,
        temperature: this.temperature,
      }),
    };

    let text: string | undefined;
    try {
      const response = await axios.post(
        url,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          stream: false,
          format: 'json',
          ...(this.think && { think: true }),
          ...body,
        },
        { timeout: timeoutMs }
      );
      const data = response.data ?? {};
      const split = splitInlineThinking(data.message?.content ?? '');
      text = split.content;
      await this.record({
        ...log,
        status: text ? 'success' : 'error',
        response: data.message?.content ?? '',
        thinking: [data.message?.thinking, split.thinking].filter(Boolean).join('\n\n'),
        error: text ? '' : 'No text response from Ollama',
        durationMs: Date.now() - startedAt,
        loadMs: nsToMs(data.load_duration),
        promptEvalMs: nsToMs(data.prompt_eval_duration),
        evalMs: nsToMs(data.eval_duration),
        promptTokens: data.prompt_eval_count,
        responseTokens: data.eval_count,
      });
    } catch (err) {
      const message = describeOllamaError(err, url, this.model);
      await this.record({
        ...log,
        status: 'error',
        response: axios.isAxiosError(err) && err.response?.data ? JSON.stringify(err.response.data) : '',
        thinking: '',
        error: message,
        durationMs: Date.now() - startedAt,
      });
      throw new Error(message);
    }

    if (!text) {
      throw new Error('No text response from Ollama');
    }

    return text;
  }

  private async record(entry: Parameters<typeof recordAiRequest>[0]): Promise<void> {
    try {
      await recordAiRequest(entry);
    } catch (err: any) {
      logger.log({ level: 'error', message: `Failed to record AI request: ${err.message}`, label: 'AiRequestLog' });
    }
  }

  async chat(
    messages: OllamaChatMessage[],
    tools: OllamaTool[],
    meta: InsightMeta,
    tuning: { numCtx?: number; timeoutMs?: number } = {}
  ): Promise<OllamaChatResult> {
    const url = `${this.host}/api/chat`;
    const { numCtx, timeoutMs, body } = this.requestTuning(tuning);
    const startedAt = Date.now();
    const log = {
      feature: meta.feature,
      provider: this.name,
      model: this.model,
      host: this.host,
      systemPrompt: messages.find((m) => m.role === 'system')?.content ?? '',
      userPrompt: JSON.stringify(
        messages.filter((m) => m.role !== 'system'),
        null,
        2
      ),
      options: JSON.stringify({
        think: this.think,
        numCtx,
        timeoutMs,
        keepAlive: this.keepAlive,
        temperature: this.temperature,
        tools: tools.map((t) => t.function.name),
      }),
    };

    try {
      const response = await axios.post(
        url,
        {
          model: this.model,
          messages,
          tools,
          stream: false,
          ...(this.think && { think: true }),
          ...body,
        },
        { timeout: timeoutMs }
      );
      const data = response.data ?? {};
      const message = data.message;
      if (!message) throw new Error('No response from Ollama');
      const split = splitInlineThinking(message.content ?? '');
      const toolCalls: OllamaToolCall[] = Array.isArray(message.tool_calls) ? message.tool_calls : [];
      await this.record({
        ...log,
        status: 'success',
        response: toolCalls.length
          ? `${split.content}\n\nTool calls:\n${JSON.stringify(toolCalls, null, 2)}`.trim()
          : split.content,
        thinking: [message.thinking, split.thinking].filter(Boolean).join('\n\n'),
        error: '',
        durationMs: Date.now() - startedAt,
        loadMs: nsToMs(data.load_duration),
        promptEvalMs: nsToMs(data.prompt_eval_duration),
        evalMs: nsToMs(data.eval_duration),
        promptTokens: data.prompt_eval_count,
        responseTokens: data.eval_count,
      });
      return {
        message: {
          role: 'assistant',
          content: split.content,
          ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
        },
        promptTokens: typeof data.prompt_eval_count === 'number' ? data.prompt_eval_count : undefined,
        numCtx,
      };
    } catch (err) {
      const errorMessage = describeOllamaError(err, url, this.model);
      await this.record({
        ...log,
        status: 'error',
        response: axios.isAxiosError(err) && err.response?.data ? JSON.stringify(err.response.data) : '',
        thinking: '',
        error: errorMessage,
        durationMs: Date.now() - startedAt,
      });
      throw new Error(errorMessage);
    }
  }
}

/** Reads what Ollama knows about a model: its maximum context, and whether it can call tools or think. */
export async function showOllamaModel(host: string, model: string): Promise<OllamaModelInfo> {
  const base = normalizeHost(host || 'http://localhost:11434');
  const url = `${base}/api/show`;
  try {
    const response = await axios.post(url, { model }, { timeout: 15000 });
    const data = response.data ?? {};
    const info: Record<string, unknown> = data.model_info ?? {};
    const contextKey = Object.keys(info).find((key) => key.endsWith('.context_length'));
    const contextLength = contextKey ? Number(info[contextKey]) : undefined;
    return {
      model,
      contextLength: Number.isFinite(contextLength) ? contextLength : undefined,
      capabilities: Array.isArray(data.capabilities) ? data.capabilities.map(String) : [],
      parameterSize: data.details?.parameter_size,
      quantization: data.details?.quantization_level,
    };
  } catch (err) {
    throw new Error(describeOllamaError(err, url, model));
  }
}
