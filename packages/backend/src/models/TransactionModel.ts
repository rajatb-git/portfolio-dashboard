import { ISkewerModel, SchemaType } from '../utils/mongoModel';

import { createStorageModel } from '../utils/storageModelFactory';

export interface ITransaction {
  accountId: string;
  symbol: string;
  qty: number;
  price: number;
  type: 'stock' | 'crypto' | 'cash';
  action: string;
  pnl?: number;
  // Actual trade date for imported history. createdAt always gets stamped with
  // the insert time, so imported rows carry the original date here instead.
  date?: string;
  // Buys: id of the tax lot the purchase opened. Sells: the lots relieved.
  lotId?: string;
  lots?: IRelievedLot[];
  // Brought in by an import. Its lot fields say whether it moved a holding
  // (built from history) or is a record only; cashApplied says whether the
  // import moved the account's cash for it.
  imported?: boolean;
  cashApplied?: boolean;
}

export interface IRelievedLot {
  lotId: string;
  qty: number;
  price: number;
  date: string;
}

export const TransactionSchema: SchemaType = {
  accountId: { type: String, required: true },
  symbol: { type: String, required: false },
  qty: { type: Number, required: true },
  price: { type: Number, required: false },
  type: { type: String, enum: ['stock', 'crypto', 'cash'], required: true },
  action: { type: String, required: true },
  pnl: { type: Number, required: false },
  date: { type: String, required: false },
  lotId: { type: String, required: false },
  lots: { type: Array, required: false },
  imported: { type: Boolean, required: false },
  cashApplied: { type: Boolean, required: false },
};

export interface ITransactionModel extends ITransaction, ISkewerModel {}

export const TransactionModel = createStorageModel<ITransactionModel>('Transaction', TransactionSchema);
