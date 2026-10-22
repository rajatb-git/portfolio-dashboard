import { ISkewerModel, SchemaType } from '../utils/mongoModel';

import { createStorageModel } from '../utils/storageModelFactory';

// One purchase of a position. A holding's qty/averagePrice are the aggregate of
// its lots, kept in sync on every write so readers that only need the totals
// never have to look at lots.
export interface ITaxLot {
  id: string;
  qty: number;
  price: number;
  date: string;
  // Date and/or cost were inferred (imported position, or history that doesn't
  // reconcile with the stored totals) rather than recorded from a trade.
  estimated?: boolean;
}

export interface IHoldings {
  accountId: string;
  name: string;
  symbol: string;
  qty: number;
  averagePrice: number;
  type: 'stock' | 'crypto';
  lots?: ITaxLot[];
}

export const HoldingsSchema: SchemaType = {
  accountId: { type: String, required: true },
  name: { type: String, required: true },
  symbol: { type: String, required: false },
  qty: { type: Number, required: true },
  averagePrice: { type: Number, required: false },
  type: { type: String, enum: ['stock', 'crypto'], required: true },
  lots: { type: Array, required: false },
};

export interface IHoldingsModel extends IHoldings, ISkewerModel {}

export const HoldingsModel = createStorageModel<IHoldingsModel>('holdings', HoldingsSchema);
