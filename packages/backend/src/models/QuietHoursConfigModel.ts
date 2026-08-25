import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';

export interface IQuietHoursConfig {
  enabled: boolean;
  // ET hours, 0-23. The window wraps midnight when start > end (e.g. 22 -> 7).
  startHour: number;
  endHour: number;
  // 'suppress' drops what lands in the window; 'digest' holds it and sends one
  // summary when the window ends.
  mode: 'suppress' | 'digest';
  // Let a big enough move through the window anyway.
  allowCritical: boolean;
  criticalThresholdPercent: number;
}

const QuietHoursConfigSchema: SchemaType = {
  enabled: { type: Boolean, required: true },
  startHour: { type: Number, required: false },
  endHour: { type: Number, required: false },
  mode: { type: String, enum: ['suppress', 'digest'], required: false },
  allowCritical: { type: Boolean, required: false },
  criticalThresholdPercent: { type: Number, required: false },
};

interface IQuietHoursConfigModel extends IQuietHoursConfig, ISkewerModel {}

const QuietHoursConfigDBModel = () =>
  new MongoModel<IQuietHoursConfigModel>('quiet_hours_config', QuietHoursConfigSchema);

const CONFIG_ID = 'quiet_hours_config';

export const DEFAULT_QUIET_HOURS_CONFIG: IQuietHoursConfig = {
  enabled: false,
  startHour: 22,
  endHour: 7,
  mode: 'digest',
  allowCritical: true,
  criticalThresholdPercent: 10,
};

const num = (value: unknown, fallback: number): number => (typeof value === 'number' ? value : fallback);
const bool = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);

export async function getQuietHoursConfig(): Promise<IQuietHoursConfig> {
  const model = await QuietHoursConfigDBModel().initialize();
  const existing = model.findById(CONFIG_ID);
  if (!existing) return DEFAULT_QUIET_HOURS_CONFIG;

  const d = DEFAULT_QUIET_HOURS_CONFIG;
  return {
    enabled: existing.enabled,
    startHour: num(existing.startHour, d.startHour),
    endHour: num(existing.endHour, d.endHour),
    mode: existing.mode === 'suppress' ? 'suppress' : d.mode,
    allowCritical: bool(existing.allowCritical, d.allowCritical),
    criticalThresholdPercent: num(existing.criticalThresholdPercent, d.criticalThresholdPercent),
  };
}

export async function saveQuietHoursConfig(config: IQuietHoursConfig): Promise<IQuietHoursConfig> {
  const model = await QuietHoursConfigDBModel().initialize();
  await model.insertOrUpdate(config, CONFIG_ID);
  return config;
}
