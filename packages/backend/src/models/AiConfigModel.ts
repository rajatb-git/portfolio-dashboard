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
  ollamaThink: boolean;
  /** Context window in tokens sent as num_ctx; Ollama's own default (2–4K) silently cuts longer prompts. */
  ollamaNumCtx: number;
  /** How long Ollama keeps the model loaded after a request, in its keep_alive format ("30m", "-1"). */
  ollamaKeepAlive: string;
  /** null leaves the model's own default in place. */
  ollamaTemperature: number | null;
  ollamaTimeoutSec: number;
  agentMaxTurns: number;
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
  ollamaThink: { type: Boolean, required: false },
  ollamaNumCtx: { type: Number, required: false },
  ollamaKeepAlive: { type: String, required: false },
  ollamaTemperature: { type: Number, required: false },
  ollamaTimeoutSec: { type: Number, required: false },
  agentMaxTurns: { type: Number, required: false },
};

export const OLLAMA_LIMITS = {
  numCtx: { min: 2048, max: 262144 },
  temperature: { min: 0, max: 2 },
  timeoutSec: { min: 30, max: 1800 },
  agentMaxTurns: { min: 2, max: 30 },
} as const;

const KEEP_ALIVE = /^(-1|0|\d+(\.\d+)?(s|m|h))$/;

function clampInt(value: unknown, fallback: number, { min, max }: { min: number; max: number }): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

/** Fills defaults and clamps stored or submitted Ollama tuning into ranges Ollama accepts. */
export function normalizeOllamaTuning(raw: Partial<IAiConfig>, fallback: IAiConfig = DEFAULT_AI_CONFIG) {
  const temperature =
    raw.ollamaTemperature === null || raw.ollamaTemperature === undefined
      ? raw.ollamaTemperature === undefined
        ? fallback.ollamaTemperature
        : null
      : Math.min(OLLAMA_LIMITS.temperature.max, Math.max(OLLAMA_LIMITS.temperature.min, Number(raw.ollamaTemperature)));
  const keepAlive = typeof raw.ollamaKeepAlive === 'string' ? raw.ollamaKeepAlive.trim() : '';
  return {
    ollamaNumCtx: clampInt(raw.ollamaNumCtx, fallback.ollamaNumCtx, OLLAMA_LIMITS.numCtx),
    ollamaKeepAlive: KEEP_ALIVE.test(keepAlive) ? keepAlive : fallback.ollamaKeepAlive,
    ollamaTemperature: Number.isFinite(temperature as number) ? (temperature as number) : null,
    ollamaTimeoutSec: clampInt(raw.ollamaTimeoutSec, fallback.ollamaTimeoutSec, OLLAMA_LIMITS.timeoutSec),
    agentMaxTurns: clampInt(raw.agentMaxTurns, fallback.agentMaxTurns, OLLAMA_LIMITS.agentMaxTurns),
  };
}

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
  ollamaThink: false,
  ollamaNumCtx: 16384,
  ollamaKeepAlive: '30m',
  ollamaTemperature: null,
  ollamaTimeoutSec: 180,
  agentMaxTurns: 10,
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
      ollamaThink: existing.ollamaThink ?? false,
      ...normalizeOllamaTuning(existing),
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
