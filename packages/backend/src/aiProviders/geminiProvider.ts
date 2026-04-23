import { GoogleGenAI } from '@google/genai';
import type { AiProvider } from './types';

export class GeminiProvider implements AiProvider {
  readonly name = 'gemini' as const;
  readonly model: string;
  private apiKey: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || 'gemini-2.0-flash';
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async generateInsight(systemPrompt: string, userPrompt: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    const response = await ai.models.generateContent({
      model: this.model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 10240,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('No text response from Gemini');
    }

    return text;
  }
}
