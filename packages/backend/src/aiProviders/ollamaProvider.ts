import axios from 'axios';
import { AiProvider } from './types';

export class OllamaProvider implements AiProvider {
  readonly name = 'ollama' as const;
  readonly model: string;
  private host: string;

  constructor(host?: string, model?: string) {
    this.host = host || 'http://localhost:11434';
    this.model = model || 'llama3.1';
  }

  isConfigured(): boolean {
    return this.host.length > 0;
  }

  async generateInsight(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await axios.post(
      `${this.host}/api/chat`,
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

    const text = response.data?.message?.content;
    if (!text) {
      throw new Error('No text response from Ollama');
    }

    return text;
  }
}
