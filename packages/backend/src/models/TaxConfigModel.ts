import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';

// Marginal rates, in percent, used for every tax estimate in the app.
export interface ITaxConfig {
  shortTermRate: number;
  longTermRate: number;
  stateRate: number;
}

const TaxConfigSchema: SchemaType = {
  shortTermRate: { type: Number, required: false },
  longTermRate: { type: Number, required: false },
  stateRate: { type: Number, required: false },
};

interface ITaxConfigModel extends ITaxConfig, ISkewerModel {}

const TaxConfigDBModel = () => new MongoModel<ITaxConfigModel>('tax_config', TaxConfigSchema);

const CONFIG_ID = 'tax_config';

const DEFAULT_TAX_CONFIG: ITaxConfig = {
  shortTermRate: 24,
  longTermRate: 15,
  stateRate: 0,
};

const rateOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export async function getTaxConfig(): Promise<ITaxConfig> {
  const model = await TaxConfigDBModel().initialize();
  const existing = model.findById(CONFIG_ID);
  if (!existing) return DEFAULT_TAX_CONFIG;
  return {
    shortTermRate: rateOr(existing.shortTermRate, DEFAULT_TAX_CONFIG.shortTermRate),
    longTermRate: rateOr(existing.longTermRate, DEFAULT_TAX_CONFIG.longTermRate),
    stateRate: rateOr(existing.stateRate, DEFAULT_TAX_CONFIG.stateRate),
  };
}

export async function saveTaxConfig(config: ITaxConfig): Promise<ITaxConfig> {
  const model = await TaxConfigDBModel().initialize();
  await model.insertOrUpdate(config, CONFIG_ID);
  return config;
}
