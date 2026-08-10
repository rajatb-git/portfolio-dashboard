import { ISkewerModel, SchemaType } from '../utils/mongoModel';

import { createStorageModel } from '../utils/storageModelFactory';

export interface IAlert {
  symbol: string;
  type: 'stock' | 'crypto';
  targetPrice: number;
  direction: 'above' | 'below'; // notify when price crosses to/above or to/below target
  note?: string;
  // Maintained by the background monitor:
  triggeredAt?: string | null; // ISO timestamp set when the condition is met, cleared when it clears
  lastPrice?: number;
  lastCheckedAt?: string;
}

export const AlertSchema: SchemaType = {
  symbol: { type: String, required: true },
  type: { type: String, enum: ['stock', 'crypto'], required: true },
  targetPrice: { type: Number, required: true },
  direction: { type: String, enum: ['above', 'below'], required: true },
  note: { type: String, required: false },
  triggeredAt: { type: String, required: false },
  lastPrice: { type: Number, required: false },
  lastCheckedAt: { type: String, required: false },
};

export interface IAlertModel extends IAlert, ISkewerModel {}

export const AlertModel = createStorageModel<IAlertModel>('alerts', AlertSchema);
