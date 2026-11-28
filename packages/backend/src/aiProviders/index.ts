import { getAiConfig, IAiConfig } from '../models/AiConfigModel';
import { ClaudeProvider } from './claudeProvider';
import { GeminiProvider } from './geminiProvider';
import { OllamaProvider } from './ollamaProvider';

/** Every Ollama call site builds its provider here, so the Settings tuning applies everywhere. */
export function buildOllama(config: IAiConfig): OllamaProvider {
  return new OllamaProvider(config.ollamaHost, config.ollamaModel, {
    think: config.ollamaThink,
    numCtx: config.ollamaNumCtx,
    keepAlive: config.ollamaKeepAlive,
    temperature: config.ollamaTemperature,
    timeoutMs: config.ollamaTimeoutSec * 1000,
  });
}

import { AiProvider, AiProviderName } from './types';

export { SYSTEM_PROMPT } from './types';
export type { AiProvider, AiProviderName };

function buildProvider(config: IAiConfig): AiProvider {
  switch (config.provider) {
    case 'claude':
      return new ClaudeProvider(config.claudeApiKey, config.claudeModel);
    case 'gemini':
      return new GeminiProvider(config.geminiApiKey, config.geminiModel);
    case 'ollama':
      return buildOllama(config);
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
