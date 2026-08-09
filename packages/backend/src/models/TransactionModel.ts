import { ISkewerModel, SchemaType } from 'skewer-db';

import { createStorageModel } from '../utils/storageModelFactory';

export interface ITransaction {
  accountId: string;
  symbol: string;
  qty: number;
  price: number;
  type: 'stock' | 'crypto' | 'cash';
  action: string;
  pnl?: number;
  // Actual trade date for imported history. SkewerDB always stamps createdAt with
  // the insert time, so imported rows carry the original date here instead.
  date?: string;
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
};

export interface ITransactionModel extends ITransaction, ISkewerModel {}

export const TransactionModel = createStorageModel<ITransactionModel>('Transaction', TransactionSchema);
