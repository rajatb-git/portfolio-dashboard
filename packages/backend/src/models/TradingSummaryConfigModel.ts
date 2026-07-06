import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface ITradingSummaryConfig {
  enabled: boolean;
  // How many of the largest holdings (by market value) to report movement for.
  topHoldingsCount: number;
  // MQTT topic the daily summaries are published to. Kept separate from the alert
  // topic so subscribers can route summaries and alerts differently.
  topic: string;
}

const TradingSummaryConfigSchema: SchemaType = {
  enabled: { type: Boolean, required: true },
  topHoldingsCount: { type: Number, required: true },
  topic: { type: String, required: false },
};

interface ITradingSummaryConfigModel extends ITradingSummaryConfig, ISkewerModel {}

const TradingSummaryConfigDBModel = () =>
  new SkewerModel<ITradingSummaryConfigModel>('trading_summary_config', TradingSummaryConfigSchema);

const CONFIG_ID = 'trading_summary_config';

export const DEFAULT_TRADING_SUMMARY_CONFIG: ITradingSummaryConfig = {
  enabled: false,
  topHoldingsCount: 5,
  topic: 'portfolio-dashboard/summary',
};

export const VALID_TOP_HOLDINGS_COUNTS = [3, 5, 10];

export async function getTradingSummaryConfig(): Promise<ITradingSummaryConfig> {
  const model = await TradingSummaryConfigDBModel().initialize();
  const existing = model.findById(CONFIG_ID);
  if (existing) {
    const d = DEFAULT_TRADING_SUMMARY_CONFIG;
    return {
      enabled: typeof existing.enabled === 'boolean' ? existing.enabled : d.enabled,
      topHoldingsCount:
        typeof existing.topHoldingsCount === 'number' ? existing.topHoldingsCount : d.topHoldingsCount,
      topic: existing.topic || d.topic,
    };
  }
  return DEFAULT_TRADING_SUMMARY_CONFIG;
}

export async function saveTradingSummaryConfig(config: ITradingSummaryConfig): Promise<ITradingSummaryConfig> {
  const model = await TradingSummaryConfigDBModel().initialize();
  await model.insertOrUpdate(config, CONFIG_ID);
  return config;
}
