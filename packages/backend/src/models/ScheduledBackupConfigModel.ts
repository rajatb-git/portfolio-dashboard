import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';

export interface IScheduledBackupConfig {
  enabled: boolean;
  intervalHours: number;
  retentionCount: number;
}

const ScheduledBackupConfigSchema: SchemaType = {
  enabled: { type: Boolean, required: true },
  intervalHours: { type: Number, required: true },
  retentionCount: { type: Number, required: true },
};

interface IScheduledBackupConfigModel extends IScheduledBackupConfig, ISkewerModel {}

const ScheduledBackupConfigDBModel = () =>
  new MongoModel<IScheduledBackupConfigModel>('scheduled_backup_config', ScheduledBackupConfigSchema);

const CONFIG_ID = 'scheduled_backup_config';

export const VALID_BACKUP_INTERVALS = [6, 12, 24, 48, 168];
export const VALID_RETENTION_COUNTS = [3, 5, 7, 14, 30];

export const DEFAULT_SCHEDULED_BACKUP_CONFIG: IScheduledBackupConfig = {
  enabled: false,
  intervalHours: 24,
  retentionCount: 7,
};

export async function getScheduledBackupConfig(): Promise<IScheduledBackupConfig> {
  const model = await ScheduledBackupConfigDBModel().initialize();
  const existing = model.findById(CONFIG_ID);
  if (existing) {
    return {
      enabled: existing.enabled,
      intervalHours:
        typeof existing.intervalHours === 'number'
          ? existing.intervalHours
          : DEFAULT_SCHEDULED_BACKUP_CONFIG.intervalHours,
      retentionCount:
        typeof existing.retentionCount === 'number'
          ? existing.retentionCount
          : DEFAULT_SCHEDULED_BACKUP_CONFIG.retentionCount,
    };
  }
  return DEFAULT_SCHEDULED_BACKUP_CONFIG;
}

export async function saveScheduledBackupConfig(config: IScheduledBackupConfig): Promise<IScheduledBackupConfig> {
  const model = await ScheduledBackupConfigDBModel().initialize();
  await model.insertOrUpdate(config, CONFIG_ID);
  return config;
}
