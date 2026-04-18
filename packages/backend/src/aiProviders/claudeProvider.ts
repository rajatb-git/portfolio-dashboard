import Anthropic from '@anthropic-ai/sdk';
import { AiProvider } from './types';

export class ClaudeProvider implements AiProvider {
  readonly name = 'claude' as const;
  readonly model: string;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY ?? '';
    this.model = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6';
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async generateInsight(systemPrompt: string, userPrompt: string): Promise<string> {
    const client = new Anthropic({ apiKey: this.apiKey });

    const response = await client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    return textContent.text;
  }
}
