import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';

export interface IValueCalcConfig {
  enabled: boolean;
  intervalMinutes: number;
}

const ValueCalcConfigSchema: SchemaType = {
  enabled: { type: Boolean, required: true },
  intervalMinutes: { type: Number, required: true },
};

interface IValueCalcConfigModel extends IValueCalcConfig, ISkewerModel {}

const ValueCalcConfigDBModel = () =>
  new MongoModel<IValueCalcConfigModel>('value_calc_config', ValueCalcConfigSchema);

const CONFIG_ID = 'value_calc_config';

export const DEFAULT_VALUE_CALC_CONFIG: IValueCalcConfig = {
  enabled: false,
  intervalMinutes: 15,
};

export async function getValueCalcConfig(): Promise<IValueCalcConfig> {
  const model = await ValueCalcConfigDBModel().initialize();
  const existing = model.findById(CONFIG_ID);
  if (existing) {
    return {
      enabled: existing.enabled,
      intervalMinutes:
        typeof existing.intervalMinutes === 'number'
          ? existing.intervalMinutes
          : DEFAULT_VALUE_CALC_CONFIG.intervalMinutes,
    };
  }
  return DEFAULT_VALUE_CALC_CONFIG;
}

export async function saveValueCalcConfig(config: IValueCalcConfig): Promise<IValueCalcConfig> {
  const model = await ValueCalcConfigDBModel().initialize();
  await model.insertOrUpdate(config, CONFIG_ID);
  return config;
}
