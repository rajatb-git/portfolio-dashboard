import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface IIpoReminderConfig {
  enabled: boolean;
  daysBefore: number;
}

const IpoReminderConfigSchema: SchemaType = {
  enabled: { type: Boolean, required: true },
  daysBefore: { type: Number, required: true },
};

interface IIpoReminderConfigModel extends IIpoReminderConfig, ISkewerModel {}

const IpoReminderConfigDBModel = () =>
  new SkewerModel<IIpoReminderConfigModel>('ipo_reminder_config', IpoReminderConfigSchema);

const CONFIG_ID = 'ipo_reminder_config';

export const VALID_DAYS_BEFORE = [0, 1, 2, 3, 7];

export const DEFAULT_IPO_REMINDER_CONFIG: IIpoReminderConfig = {
  enabled: true,
  daysBefore: 1,
};

export async function getIpoReminderConfig(): Promise<IIpoReminderConfig> {
  const model = await IpoReminderConfigDBModel().initialize();
  const existing = model.findById(CONFIG_ID);
  if (existing) {
    return {
      enabled: existing.enabled,
      daysBefore: typeof existing.daysBefore === 'number' ? existing.daysBefore : DEFAULT_IPO_REMINDER_CONFIG.daysBefore,
    };
  }
  return DEFAULT_IPO_REMINDER_CONFIG;
}

export async function saveIpoReminderConfig(config: IIpoReminderConfig): Promise<IIpoReminderConfig> {
  const model = await IpoReminderConfigDBModel().initialize();
  await model.insertOrUpdate(config, CONFIG_ID);
  return config;
}
