import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface IAlert {
  symbol: string;
  type: 'stock' | 'crypto';
  targetPrice: number;
  direction: 'above' | 'below'; // notify when price crosses to/above or to/below target
  note?: string;
}

export const AlertSchema: SchemaType = {
  symbol: { type: String, required: true },
  type: { type: String, enum: ['stock', 'crypto'], required: true },
  targetPrice: { type: Number, required: true },
  direction: { type: String, enum: ['above', 'below'], required: true },
  note: { type: String, required: false },
};

export interface IAlertModel extends IAlert, ISkewerModel {}

let instance: SkewerModel<IAlertModel> | null = null;

export const AlertModel = (): SkewerModel<IAlertModel> => {
  if (!instance) {
    instance = new SkewerModel<IAlertModel>('alerts', AlertSchema);
  }
  return instance;
};
