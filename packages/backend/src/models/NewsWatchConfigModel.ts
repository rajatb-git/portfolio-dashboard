import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';

export interface INewsWatchConfig {
  enabled: boolean;
  intervalMinutes: number;
  topic: string;
  // Company news for the tickers you actually hold.
  watchHoldings: boolean;
  // Broad market headlines, tagged with a holding when one is mentioned.
  watchMarket: boolean;
  // Only publish headlines matching a market-moving keyword.
  breakingOnly: boolean;
  // Ceiling on notifications per cycle, so a busy news hour can't flood you.
  maxPerRun: number;
  // Ignore anything published longer ago than this — on a restart you want the
  // last hour's news, not yesterday's.
  lookbackHours: number;
}

const NewsWatchConfigSchema: SchemaType = {
  enabled: { type: Boolean, required: true },
  intervalMinutes: { type: Number, required: true },
  topic: { type: String, required: false },
  watchHoldings: { type: Boolean, required: false },
  watchMarket: { type: Boolean, required: false },
  breakingOnly: { type: Boolean, required: false },
  maxPerRun: { type: Number, required: false },
  lookbackHours: { type: Number, required: false },
};

interface INewsWatchConfigModel extends INewsWatchConfig, ISkewerModel {}

const NewsWatchConfigDBModel = () => new MongoModel<INewsWatchConfigModel>('news_watch_config', NewsWatchConfigSchema);

const CONFIG_ID = 'news_watch_config';

export const DEFAULT_NEWS_WATCH_CONFIG: INewsWatchConfig = {
  enabled: false,
  intervalMinutes: 15,
  topic: 'portfolio-dashboard/news',
  watchHoldings: true,
  watchMarket: true,
  breakingOnly: true,
  maxPerRun: 5,
  lookbackHours: 6,
};

const num = (value: unknown, fallback: number): number => (typeof value === 'number' ? value : fallback);
const bool = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);

export async function getNewsWatchConfig(): Promise<INewsWatchConfig> {
  const model = await NewsWatchConfigDBModel().initialize();
  const existing = model.findById(CONFIG_ID);
  if (!existing) return DEFAULT_NEWS_WATCH_CONFIG;

  const d = DEFAULT_NEWS_WATCH_CONFIG;
  return {
    enabled: existing.enabled,
    intervalMinutes: num(existing.intervalMinutes, d.intervalMinutes),
    topic: existing.topic || d.topic,
    watchHoldings: bool(existing.watchHoldings, d.watchHoldings),
    watchMarket: bool(existing.watchMarket, d.watchMarket),
    breakingOnly: bool(existing.breakingOnly, d.breakingOnly),
    maxPerRun: num(existing.maxPerRun, d.maxPerRun),
    lookbackHours: num(existing.lookbackHours, d.lookbackHours),
  };
}

export async function saveNewsWatchConfig(config: INewsWatchConfig): Promise<INewsWatchConfig> {
  const model = await NewsWatchConfigDBModel().initialize();
  await model.insertOrUpdate(config, CONFIG_ID);
  return config;
}
