import { GoogleGenAI } from '@google/genai';
import { AiProvider } from './types';

export class GeminiProvider implements AiProvider {
  readonly name = 'gemini' as const;
  readonly model: string;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY ?? '';
    this.model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
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
        maxOutputTokens: 1024,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('No text response from Gemini');
    }

    return text;
  }
}
