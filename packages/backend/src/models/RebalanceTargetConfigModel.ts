import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';
import { logger } from '../utils/winston';

export type RebalanceTarget = {
  symbol: string;
  targetPercent: number;
};

export interface IRebalanceTargetConfig {
  targets: RebalanceTarget[];
}

// Holdover from skewer-db, whose schemas were flat primitives only — MongoDB
// supports nested docs natively, but unflattening this is out of scope here.
// The variable-length target list stays serialized to a JSON string column
// and parsed back on read.
interface IRebalanceTargetConfigFlat {
  targetsJson: string;
}

const RebalanceTargetConfigSchema: SchemaType = {
  targetsJson: { type: String, required: true },
};

interface IRebalanceTargetConfigModel extends IRebalanceTargetConfigFlat, ISkewerModel {}

const RebalanceTargetConfigDBModel = () =>
  new MongoModel<IRebalanceTargetConfigModel>('rebalance_target_config', RebalanceTargetConfigSchema);

const CONFIG_ID = 'rebalance_target_config';

const normalizeTargets = (raw: unknown): RebalanceTarget[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (t): t is RebalanceTarget => !!t && typeof t.symbol === 'string' && Number.isFinite(Number(t.targetPercent))
    )
    .map((t) => ({ symbol: t.symbol.toUpperCase(), targetPercent: +Number(t.targetPercent).toFixed(2) }));
};

export async function getRebalanceTargetConfig(): Promise<IRebalanceTargetConfig> {
  const model = await RebalanceTargetConfigDBModel().initialize();
  const existing = model.findById(CONFIG_ID);
  if (!existing?.targetsJson) return { targets: [] };
  try {
    return { targets: normalizeTargets(JSON.parse(existing.targetsJson)) };
  } catch (err: any) {
    logger.log({ level: 'error', label: 'RebalanceTargetConfig', message: `Failed to parse targets: ${err.message}` });
    return { targets: [] };
  }
}

export async function saveRebalanceTargetConfig(config: IRebalanceTargetConfig): Promise<IRebalanceTargetConfig> {
  const targets = normalizeTargets(config.targets);
  const model = await RebalanceTargetConfigDBModel().initialize();
  await model.insertOrUpdate({ targetsJson: JSON.stringify(targets) }, CONFIG_ID);
  return { targets };
}
