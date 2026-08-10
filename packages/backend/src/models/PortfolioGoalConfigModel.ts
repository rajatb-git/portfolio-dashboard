import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';

export interface IPortfolioGoalConfig {
  label: string;
  targetValue: number;
  targetDate: string | null; // YYYY-MM-DD, optional deadline
}

const PortfolioGoalConfigSchema: SchemaType = {
  label: { type: String, required: true },
  targetValue: { type: Number, required: true },
  targetDate: { type: String, required: false },
};

interface IPortfolioGoalConfigModel extends IPortfolioGoalConfig, ISkewerModel {}

const PortfolioGoalConfigDBModel = () =>
  new MongoModel<IPortfolioGoalConfigModel>('portfolio_goal_config', PortfolioGoalConfigSchema);

const CONFIG_ID = 'portfolio_goal_config';

export const DEFAULT_PORTFOLIO_GOAL_CONFIG: IPortfolioGoalConfig = {
  label: 'Portfolio Goal',
  targetValue: 0,
  targetDate: null,
};

export async function getPortfolioGoalConfig(): Promise<IPortfolioGoalConfig> {
  const model = await PortfolioGoalConfigDBModel().initialize();
  const existing = model.findById(CONFIG_ID);
  if (existing) {
    return {
      label: existing.label || DEFAULT_PORTFOLIO_GOAL_CONFIG.label,
      targetValue: typeof existing.targetValue === 'number' ? existing.targetValue : 0,
      targetDate: existing.targetDate ?? null,
    };
  }
  return DEFAULT_PORTFOLIO_GOAL_CONFIG;
}

export async function savePortfolioGoalConfig(config: IPortfolioGoalConfig): Promise<IPortfolioGoalConfig> {
  const model = await PortfolioGoalConfigDBModel().initialize();
  await model.insertOrUpdate(config, CONFIG_ID);
  return config;
}
