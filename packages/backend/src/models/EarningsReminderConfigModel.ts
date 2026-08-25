import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';

export interface IEarningsReminderConfig {
  enabled: boolean;
  // How many days ahead of the report to send the heads-up.
  daysBefore: number;
  // Follow up with actual-vs-estimate once the numbers land.
  notifyResults: boolean;
  topic: string;
}

const EarningsReminderConfigSchema: SchemaType = {
  enabled: { type: Boolean, required: true },
  daysBefore: { type: Number, required: false },
  notifyResults: { type: Boolean, required: false },
  topic: { type: String, required: false },
};

interface IEarningsReminderConfigModel extends IEarningsReminderConfig, ISkewerModel {}

const EarningsReminderConfigDBModel = () =>
  new MongoModel<IEarningsReminderConfigModel>('earnings_reminder_config', EarningsReminderConfigSchema);

const CONFIG_ID = 'earnings_reminder_config';

export const VALID_EARNINGS_DAYS_BEFORE = [0, 1, 2, 3, 7];

export const DEFAULT_EARNINGS_REMINDER_CONFIG: IEarningsReminderConfig = {
  enabled: false,
  daysBefore: 1,
  notifyResults: true,
  topic: 'portfolio-dashboard/earnings',
};

export async function getEarningsReminderConfig(): Promise<IEarningsReminderConfig> {
  const model = await EarningsReminderConfigDBModel().initialize();
  const existing = model.findById(CONFIG_ID);
  if (!existing) return DEFAULT_EARNINGS_REMINDER_CONFIG;

  const d = DEFAULT_EARNINGS_REMINDER_CONFIG;
  return {
    enabled: existing.enabled,
    daysBefore: typeof existing.daysBefore === 'number' ? existing.daysBefore : d.daysBefore,
    notifyResults: typeof existing.notifyResults === 'boolean' ? existing.notifyResults : d.notifyResults,
    topic: existing.topic || d.topic,
  };
}

export async function saveEarningsReminderConfig(
  config: IEarningsReminderConfig
): Promise<IEarningsReminderConfig> {
  const model = await EarningsReminderConfigDBModel().initialize();
  await model.insertOrUpdate(config, CONFIG_ID);
  return config;
}
