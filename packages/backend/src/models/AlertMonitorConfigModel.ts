import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface IAlertMonitorConfig {
  enabled: boolean;
  intervalMinutes: number;
}

const AlertMonitorConfigSchema: SchemaType = {
  enabled: { type: Boolean, required: true },
  intervalMinutes: { type: Number, required: true },
};

interface IAlertMonitorConfigModel extends IAlertMonitorConfig, ISkewerModel {}

const AlertMonitorConfigDBModel = () =>
  new SkewerModel<IAlertMonitorConfigModel>('alert_monitor_config', AlertMonitorConfigSchema);

const CONFIG_ID = 'alert_monitor_config';

// Alerts are useless without the monitor, so it defaults to ON.
export const DEFAULT_ALERT_MONITOR_CONFIG: IAlertMonitorConfig = {
  enabled: true,
  intervalMinutes: 5,
};

export async function getAlertMonitorConfig(): Promise<IAlertMonitorConfig> {
  const model = await AlertMonitorConfigDBModel().initialize();
  const existing = model.findById(CONFIG_ID);
  if (existing) {
    return {
      enabled: existing.enabled,
      intervalMinutes:
        typeof existing.intervalMinutes === 'number'
          ? existing.intervalMinutes
          : DEFAULT_ALERT_MONITOR_CONFIG.intervalMinutes,
    };
  }
  return DEFAULT_ALERT_MONITOR_CONFIG;
}

export async function saveAlertMonitorConfig(config: IAlertMonitorConfig): Promise<IAlertMonitorConfig> {
  const model = await AlertMonitorConfigDBModel().initialize();
  await model.insertOrUpdate(config, CONFIG_ID);
  return config;
}
