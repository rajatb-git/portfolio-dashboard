import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface IHoldings {
  accountId: string;
  name: string;
  symbol: string;
  qty: number;
  averagePrice: number;
  type: 'stock' | 'crypto';
}

export const HoldingsSchema: SchemaType = {
  accountId: { type: String, required: true },
  name: { type: String, required: true },
  symbol: { type: String, required: false },
  qty: { type: Number, required: true },
  averagePrice: { type: Number, required: false },
  type: { type: String, enum: ['stock', 'crypto'], required: true },
};

export interface IHoldingsModel extends IHoldings, ISkewerModel {}

let instance: SkewerModel<IHoldingsModel> | null = null;

export const HoldingsModel = (): SkewerModel<IHoldingsModel> => {
  if (!instance) {
    instance = new SkewerModel<IHoldingsModel>('holdings', HoldingsSchema);
  }
  return instance;
};
