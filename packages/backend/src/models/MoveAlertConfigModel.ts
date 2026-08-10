import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';

export interface IMoveAlertConfig {
  enabled: boolean;
  intervalMinutes: number;
  thresholdPercent: number;
}

const MoveAlertConfigSchema: SchemaType = {
  enabled: { type: Boolean, required: true },
  intervalMinutes: { type: Number, required: true },
  thresholdPercent: { type: Number, required: true },
};

interface IMoveAlertConfigModel extends IMoveAlertConfig, ISkewerModel {}

const MoveAlertConfigDBModel = () =>
  new MongoModel<IMoveAlertConfigModel>('move_alert_config', MoveAlertConfigSchema);

const CONFIG_ID = 'move_alert_config';

export const DEFAULT_MOVE_ALERT_CONFIG: IMoveAlertConfig = {
  enabled: false,
  intervalMinutes: 15,
  thresholdPercent: 5,
};

export async function getMoveAlertConfig(): Promise<IMoveAlertConfig> {
  const model = await MoveAlertConfigDBModel().initialize();
  const existing = model.findById(CONFIG_ID);
  if (existing) {
    return {
      enabled: existing.enabled,
      intervalMinutes:
        typeof existing.intervalMinutes === 'number'
          ? existing.intervalMinutes
          : DEFAULT_MOVE_ALERT_CONFIG.intervalMinutes,
      thresholdPercent:
        typeof existing.thresholdPercent === 'number'
          ? existing.thresholdPercent
          : DEFAULT_MOVE_ALERT_CONFIG.thresholdPercent,
    };
  }
  return DEFAULT_MOVE_ALERT_CONFIG;
}

export async function saveMoveAlertConfig(config: IMoveAlertConfig): Promise<IMoveAlertConfig> {
  const model = await MoveAlertConfigDBModel().initialize();
  await model.insertOrUpdate(config, CONFIG_ID);
  return config;
}
