import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';

export interface IAiConfig {
  enabled: boolean;
  provider: 'claude' | 'gemini' | 'ollama';
  claudeApiKey: string;
  claudeModel: string;
  geminiApiKey: string;
  geminiModel: string;
  ollamaHost: string;
  ollamaModel: string;
}

export const AiConfigSchema: SchemaType = {
  enabled: { type: Boolean, required: true },
  provider: { type: String, enum: ['claude', 'gemini', 'ollama'], required: true },
  claudeApiKey: { type: String, required: false },
  claudeModel: { type: String, required: false },
  geminiApiKey: { type: String, required: false },
  geminiModel: { type: String, required: false },
  ollamaHost: { type: String, required: false },
  ollamaModel: { type: String, required: false },
};

export interface IAiConfigModel extends IAiConfig, ISkewerModel {}

export const AiConfigDBModel = () => new MongoModel<IAiConfigModel>('ai_config', AiConfigSchema);

const CONFIG_ID = 'ai_config';

export const DEFAULT_AI_CONFIG: IAiConfig = {
  enabled: false,
  provider: 'ollama',
  claudeApiKey: '',
  claudeModel: 'claude-sonnet-4-6',
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
  ollamaHost: 'http://localhost:11434',
  ollamaModel: 'llama3.1',
};

export async function getAiConfig(): Promise<IAiConfig> {
  const model = await AiConfigDBModel().initialize();
  const existing = model.findById(CONFIG_ID);
  if (existing) {
    return {
      enabled: existing.enabled,
      provider: existing.provider,
      claudeApiKey: existing.claudeApiKey ?? '',
      claudeModel: existing.claudeModel || DEFAULT_AI_CONFIG.claudeModel,
      geminiApiKey: existing.geminiApiKey ?? '',
      geminiModel: existing.geminiModel || DEFAULT_AI_CONFIG.geminiModel,
      ollamaHost: existing.ollamaHost || DEFAULT_AI_CONFIG.ollamaHost,
      ollamaModel: existing.ollamaModel || DEFAULT_AI_CONFIG.ollamaModel,
    };
  }
  return DEFAULT_AI_CONFIG;
}

export async function saveAiConfig(config: IAiConfig): Promise<IAiConfig> {
  const model = await AiConfigDBModel().initialize();
  await model.insertOrUpdate(config, CONFIG_ID);
  return config;
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return key ? '••••' : '';
  return '••••••••' + key.slice(-4);
}

export function maskAiConfig(config: IAiConfig) {
  return {
    ...config,
    claudeApiKey: maskKey(config.claudeApiKey),
    geminiApiKey: maskKey(config.geminiApiKey),
  };
}
