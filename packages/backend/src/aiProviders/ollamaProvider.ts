import axios from 'axios';
import { recordAiRequest } from '../models/AiRequestLogModel';
import { logger } from '../utils/winston';
import { AiProvider, InsightMeta } from './types';

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

  constructor(host?: string, model?: string, think = false) {
    this.host = normalizeHost(host || 'http://localhost:11434');
    this.model = model || 'llama3.1';
    this.think = think;
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
    const timeoutMs = tuning.timeoutMs ?? 120000;
    const startedAt = Date.now();
    const log = {
      feature: meta.feature,
      provider: this.name,
      model: this.model,
      host: this.host,
      systemPrompt,
      userPrompt,
      options: JSON.stringify({ think: this.think, numCtx: tuning.numCtx, timeoutMs }),
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
          ...(tuning.numCtx && { options: { num_ctx: tuning.numCtx } }),
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
}
