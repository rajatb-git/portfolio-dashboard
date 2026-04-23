export type AiProviderName = 'claude' | 'gemini' | 'ollama';

export type AiProviderConfig = {
  name: AiProviderName;
  model: string;
  configured: boolean;
};

export interface AiProvider {
  readonly name: AiProviderName;
  readonly model: string;
  isConfigured(): boolean;
  generateInsight(systemPrompt: string, userPrompt: string): Promise<string>;
}

export const SYSTEM_PROMPT = `You are a senior equity research analyst. Given market data for a stock, provide a concise investment analysis. Respond ONLY with valid JSON matching this exact schema (no markdown, no code fences):
{
  "summary": "2-3 sentence overall assessment",
  "sentiment": "bullish" | "bearish" | "neutral",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "risks": ["risk 1", "risk 2"],
  "catalysts": ["catalyst 1", "catalyst 2"]
}
Keep each point to one sentence. Be specific with numbers from the data provided. Do not give financial advice - frame as analysis observations.`;
