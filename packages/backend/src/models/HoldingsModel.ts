import { ISkewerModel, SchemaType } from 'skewer-db';

import { createStorageModel } from '../utils/storageModelFactory';

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

export const HoldingsModel = createStorageModel<IHoldingsModel>('holdings', HoldingsSchema);
