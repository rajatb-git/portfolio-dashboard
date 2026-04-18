import { AiProvider, AiProviderName } from './types';
import { ClaudeProvider } from './claudeProvider';
import { GeminiProvider } from './geminiProvider';
import { OllamaProvider } from './ollamaProvider';
import { getAiConfig, IAiConfig } from '../models/AiConfigModel';

export { SYSTEM_PROMPT } from './types';
export type { AiProvider, AiProviderName };

function buildProvider(config: IAiConfig): AiProvider {
  switch (config.provider) {
    case 'claude':
      return new ClaudeProvider(config.claudeApiKey, config.claudeModel);
    case 'gemini':
      return new GeminiProvider(config.geminiApiKey, config.geminiModel);
    case 'ollama':
      return new OllamaProvider(config.ollamaHost, config.ollamaModel);
  }
}

export async function getActiveProvider(): Promise<AiProvider> {
  const config = await getAiConfig();

  if (!config.enabled) {
    throw new Error('AI agent is not enabled. Enable it in Settings.');
  }

  const provider = buildProvider(config);

  if (!provider.isConfigured()) {
    throw new Error(`AI provider "${config.provider}" is selected but not configured. Update settings.`);
  }

  return provider;
}
