import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface IHoldings {
  accountId: string;
  name: string;
  symbol: string;
  qty: number;
  averagePrice: number;
  targetPrice: number;
  type: 'stock' | 'crypto';
}

export const HoldingsSchema: SchemaType = {
  accountId: { type: String, required: true },
  name: { type: String, required: true },
  symbol: { type: String, required: false },
  qty: { type: Number, required: true },
  averagePrice: { type: Number, required: false },
  targetPrice: { type: Number, required: false },
  type: { type: String, enum: ['stock', 'crypto'], required: true },
};

export interface IHoldingsModel extends IHoldings, ISkewerModel {}

export const HoldingsModel = () => new SkewerModel<IHoldingsModel>('holdings', HoldingsSchema);
