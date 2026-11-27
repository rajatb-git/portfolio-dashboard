import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';

export interface IAiRequestLog {
  feature: string;
  provider: string;
  model: string;
  host: string;
  status: 'success' | 'error';
  systemPrompt: string;
  userPrompt: string;
  response: string;
  thinking: string;
  error: string;
  // Wall-clock time as seen by the backend, including network.
  durationMs: number;
  // Ollama's own timings (ns converted to ms) and token counts, when it returned them.
  loadMs?: number;
  promptEvalMs?: number;
  evalMs?: number;
  promptTokens?: number;
  responseTokens?: number;
  options: string;
}

export const AiRequestLogSchema: SchemaType = {
  feature: { type: String, required: true },
  provider: { type: String, required: true },
  model: { type: String, required: true },
  host: { type: String, required: false },
  status: { type: String, enum: ['success', 'error'], required: true },
  systemPrompt: { type: String, required: false },
  userPrompt: { type: String, required: false },
  response: { type: String, required: false },
  thinking: { type: String, required: false },
  error: { type: String, required: false },
  durationMs: { type: Number, required: false },
  loadMs: { type: Number, required: false },
  promptEvalMs: { type: Number, required: false },
  evalMs: { type: Number, required: false },
  promptTokens: { type: Number, required: false },
  responseTokens: { type: Number, required: false },
  options: { type: String, required: false },
};

export interface IAiRequestLogModel extends IAiRequestLog, ISkewerModel {}

export const AiRequestLogDBModel = () => new MongoModel<IAiRequestLogModel>('ai_request_log', AiRequestLogSchema);

// MongoModel loads the whole collection into memory, and document-import
// prompts can be large, so both the entry count and each text field are capped.
const MAX_ENTRIES = 200;
const MAX_FIELD_CHARS = 100_000;

function clip(text: string): string {
  if (text.length <= MAX_FIELD_CHARS) return text;
  return `${text.slice(0, MAX_FIELD_CHARS)}\n…[truncated ${text.length - MAX_FIELD_CHARS} chars]`;
}

export async function recordAiRequest(entry: IAiRequestLog): Promise<void> {
  const model = await AiRequestLogDBModel().initialize();
  await model.insertOne({
    ...entry,
    systemPrompt: clip(entry.systemPrompt),
    userPrompt: clip(entry.userPrompt),
    response: clip(entry.response),
    thinking: clip(entry.thinking),
  });
  const all = model.getAllRecords();
  const excess = all.length - MAX_ENTRIES;
  if (excess > 0) {
    const oldest = [...all].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, excess);
    for (const rec of oldest) await model.deleteById(rec.id);
  }
}

export async function listAiRequests(): Promise<IAiRequestLogModel[]> {
  const model = await AiRequestLogDBModel().initialize();
  return [...model.getAllRecords()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function clearAiRequests(): Promise<void> {
  const model = await AiRequestLogDBModel().initialize();
  await model.deleteAll();
}
