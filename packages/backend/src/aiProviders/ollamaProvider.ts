import axios from 'axios';
import { AiProvider } from './types';

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
  if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
    return `Could not reach Ollama at ${url} (${err.code}). Ensure Ollama is running and reachable from the server. When the app runs in Docker, use http://host.docker.internal:11434 instead of localhost.`;
  }
  return `Ollama request to ${url} failed: ${err.message}`;
}

export class OllamaProvider implements AiProvider {
  readonly name = 'ollama' as const;
  readonly model: string;
  private host: string;

  constructor(host?: string, model?: string) {
    this.host = normalizeHost(host || 'http://localhost:11434');
    this.model = model || 'llama3.1';
  }

  isConfigured(): boolean {
    return this.host.length > 0;
  }

  async generateInsight(systemPrompt: string, userPrompt: string): Promise<string> {
    const url = `${this.host}/api/chat`;

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
        },
        { timeout: 120000 }
      );
      text = response.data?.message?.content;
    } catch (err) {
      throw new Error(describeOllamaError(err, url, this.model));
    }

    if (!text) {
      throw new Error('No text response from Ollama');
    }

    return text;
  }
}
