import { AiProvider, AiProviderConfig, AiProviderName } from './types';
import { ClaudeProvider } from './claudeProvider';
import { GeminiProvider } from './geminiProvider';
import { OllamaProvider } from './ollamaProvider';

export { SYSTEM_PROMPT } from './types';
export type { AiProvider, AiProviderConfig, AiProviderName };

const providers: Record<AiProviderName, () => AiProvider> = {
  claude: () => new ClaudeProvider(),
  gemini: () => new GeminiProvider(),
  ollama: () => new OllamaProvider(),
};

export function getActiveProvider(): AiProvider {
  const explicit = process.env.AI_PROVIDER as AiProviderName | undefined;

  if (explicit && providers[explicit]) {
    const provider = providers[explicit]();
    if (!provider.isConfigured()) {
      throw new Error(`AI provider "${explicit}" is set but not configured. Check your env vars.`);
    }
    return provider;
  }

  // Auto-detect: prefer Claude → Gemini → Ollama
  if (process.env.ANTHROPIC_API_KEY) return new ClaudeProvider();
  if (process.env.GEMINI_API_KEY) return new GeminiProvider();

  // Ollama is always available as fallback (local, no key needed)
  return new OllamaProvider();
}

export function getAllProviderConfigs(): AiProviderConfig[] {
  return (['claude', 'gemini', 'ollama'] as AiProviderName[]).map((name) => {
    const provider = providers[name]();
    return {
      name,
      model: provider.model,
      configured: provider.isConfigured(),
    };
  });
}

export function getActiveProviderConfig(): AiProviderConfig & { active: true } {
  const provider = getActiveProvider();
  return {
    name: provider.name,
    model: provider.model,
    configured: provider.isConfigured(),
    active: true,
  };
}
