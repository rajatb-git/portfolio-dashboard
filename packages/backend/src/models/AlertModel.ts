import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

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

let instance: SkewerModel<IAlertModel> | null = null;

export const AlertModel = (): SkewerModel<IAlertModel> => {
  if (!instance) {
    instance = new SkewerModel<IAlertModel>('alerts', AlertSchema);
  }
  return instance;
};
