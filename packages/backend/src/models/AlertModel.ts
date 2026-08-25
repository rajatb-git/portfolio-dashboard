import { ISkewerModel, SchemaType } from '../utils/mongoModel';

import { createStorageModel } from '../utils/storageModelFactory';

// What the alert actually watches:
//  price         — a fixed target price, in the given direction
//  trailing_stop — a drop of trailPercent from the highest price seen since arming
//  pct_from_high — a drop of thresholdPercent from the 52-week high
//  cost_basis    — a cross of what the position actually cost you
export type AlertCondition = 'price' | 'trailing_stop' | 'pct_from_high' | 'cost_basis';

export const ALERT_CONDITIONS: AlertCondition[] = ['price', 'trailing_stop', 'pct_from_high', 'cost_basis'];

export interface IAlert {
  symbol: string;
  type: 'stock' | 'crypto';
  condition: AlertCondition;
  targetPrice: number;
  direction: 'above' | 'below'; // notify when price crosses to/above or to/below target
  // trailing_stop: how far off the running peak triggers the alert.
  trailPercent?: number;
  // pct_from_high: how far below the 52-week high triggers the alert.
  thresholdPercent?: number;
  note?: string;
  // Maintained by the monitor for trailing stops: the highest price seen so far.
  peakPrice?: number;
  // Maintained by the background monitor:
  triggeredAt?: string | null; // ISO timestamp set when the condition is met, cleared when it clears
  lastPrice?: number;
  lastCheckedAt?: string;
}

export const AlertSchema: SchemaType = {
  symbol: { type: String, required: true },
  type: { type: String, enum: ['stock', 'crypto'], required: true },
  condition: { type: String, enum: ALERT_CONDITIONS, required: false },
  targetPrice: { type: Number, required: false },
  direction: { type: String, enum: ['above', 'below'], required: true },
  trailPercent: { type: Number, required: false },
  thresholdPercent: { type: Number, required: false },
  note: { type: String, required: false },
  peakPrice: { type: Number, required: false },
  triggeredAt: { type: String, required: false },
  lastPrice: { type: Number, required: false },
  lastCheckedAt: { type: String, required: false },
};

export interface IAlertModel extends IAlert, ISkewerModel {}

export const AlertModel = createStorageModel<IAlertModel>('alerts', AlertSchema);
