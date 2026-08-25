import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';

export interface IDividendWatchConfig {
  enabled: boolean;
  // How many days ahead of an ex-date or payment to notify.
  daysBefore: number;
  // Buying before the ex-date is what earns the payment, so it is the one worth
  // knowing in advance; the payment notice is the money actually landing.
  notifyExDate: boolean;
  notifyPayment: boolean;
  topic: string;
}

const DividendWatchConfigSchema: SchemaType = {
  enabled: { type: Boolean, required: true },
  daysBefore: { type: Number, required: false },
  notifyExDate: { type: Boolean, required: false },
  notifyPayment: { type: Boolean, required: false },
  topic: { type: String, required: false },
};

interface IDividendWatchConfigModel extends IDividendWatchConfig, ISkewerModel {}

const DividendWatchConfigDBModel = () =>
  new MongoModel<IDividendWatchConfigModel>('dividend_watch_config', DividendWatchConfigSchema);

const CONFIG_ID = 'dividend_watch_config';

export const VALID_DIVIDEND_DAYS_BEFORE = [0, 1, 2, 3, 7, 14];

export const DEFAULT_DIVIDEND_WATCH_CONFIG: IDividendWatchConfig = {
  enabled: false,
  daysBefore: 3,
  notifyExDate: true,
  notifyPayment: true,
  topic: 'portfolio-dashboard/dividends',
};

export async function getDividendWatchConfig(): Promise<IDividendWatchConfig> {
  const model = await DividendWatchConfigDBModel().initialize();
  const existing = model.findById(CONFIG_ID);
  if (!existing) return DEFAULT_DIVIDEND_WATCH_CONFIG;

  const d = DEFAULT_DIVIDEND_WATCH_CONFIG;
  return {
    enabled: existing.enabled,
    daysBefore: typeof existing.daysBefore === 'number' ? existing.daysBefore : d.daysBefore,
    notifyExDate: typeof existing.notifyExDate === 'boolean' ? existing.notifyExDate : d.notifyExDate,
    notifyPayment: typeof existing.notifyPayment === 'boolean' ? existing.notifyPayment : d.notifyPayment,
    topic: existing.topic || d.topic,
  };
}

export async function saveDividendWatchConfig(config: IDividendWatchConfig): Promise<IDividendWatchConfig> {
  const model = await DividendWatchConfigDBModel().initialize();
  await model.insertOrUpdate(config, CONFIG_ID);
  return config;
}
