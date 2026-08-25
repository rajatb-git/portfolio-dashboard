import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';

export interface IMoveAlertConfig {
  enabled: boolean;
  intervalMinutes: number;
  thresholdPercent: number;
  // Re-notify each time a move grows this much beyond the level last announced.
  // 0 keeps a symbol to a single notification per day.
  escalationStepPercent: number;
  // Intraday velocity: notify when a symbol moves this much within
  // spikeWindowMinutes, regardless of where its day change sits. 0 disables it.
  spikePercent: number;
  spikeWindowMinutes: number;
  // Crypto trades around the clock, so evaluate it outside US equity hours too.
  cryptoAlwaysOn: boolean;
  // Keep evaluating stocks when the US equity session is closed, so a move that
  // landed at the close still reaches you if the server was down at the time.
  includeAfterHours: boolean;
}

const MoveAlertConfigSchema: SchemaType = {
  enabled: { type: Boolean, required: true },
  intervalMinutes: { type: Number, required: true },
  thresholdPercent: { type: Number, required: true },
  escalationStepPercent: { type: Number, required: false },
  spikePercent: { type: Number, required: false },
  spikeWindowMinutes: { type: Number, required: false },
  cryptoAlwaysOn: { type: Boolean, required: false },
  includeAfterHours: { type: Boolean, required: false },
};

interface IMoveAlertConfigModel extends IMoveAlertConfig, ISkewerModel {}

const MoveAlertConfigDBModel = () =>
  new MongoModel<IMoveAlertConfigModel>('move_alert_config', MoveAlertConfigSchema);

const CONFIG_ID = 'move_alert_config';

export const DEFAULT_MOVE_ALERT_CONFIG: IMoveAlertConfig = {
  enabled: false,
  intervalMinutes: 15,
  thresholdPercent: 5,
  escalationStepPercent: 3,
  spikePercent: 2,
  spikeWindowMinutes: 30,
  cryptoAlwaysOn: true,
  includeAfterHours: true,
};

const num = (value: unknown, fallback: number): number => (typeof value === 'number' ? value : fallback);
const bool = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);

export async function getMoveAlertConfig(): Promise<IMoveAlertConfig> {
  const model = await MoveAlertConfigDBModel().initialize();
  const existing = model.findById(CONFIG_ID);
  if (!existing) return DEFAULT_MOVE_ALERT_CONFIG;

  const d = DEFAULT_MOVE_ALERT_CONFIG;
  return {
    enabled: existing.enabled,
    intervalMinutes: num(existing.intervalMinutes, d.intervalMinutes),
    thresholdPercent: num(existing.thresholdPercent, d.thresholdPercent),
    escalationStepPercent: num(existing.escalationStepPercent, d.escalationStepPercent),
    spikePercent: num(existing.spikePercent, d.spikePercent),
    spikeWindowMinutes: num(existing.spikeWindowMinutes, d.spikeWindowMinutes),
    cryptoAlwaysOn: bool(existing.cryptoAlwaysOn, d.cryptoAlwaysOn),
    includeAfterHours: bool(existing.includeAfterHours, d.includeAfterHours),
  };
}

export async function saveMoveAlertConfig(config: IMoveAlertConfig): Promise<IMoveAlertConfig> {
  const model = await MoveAlertConfigDBModel().initialize();
  await model.insertOrUpdate(config, CONFIG_ID);
  return config;
}
