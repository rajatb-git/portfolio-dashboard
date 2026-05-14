import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface ITransaction {
  accountId: string;
  symbol: string;
  qty: number;
  price: number;
  type: 'stock' | 'crypto' | 'cash';
  action: string;
}

export const TransactionSchema: SchemaType = {
  accountId: { type: String, required: true },
  symbol: { type: String, required: false },
  qty: { type: Number, required: true },
  price: { type: Number, required: false },
  type: { type: String, enum: ['stock', 'crypto', 'cash'], required: true },
  action: { type: String, required: true },
};

export interface ITransactionModel extends ITransaction, ISkewerModel {}

let instance: SkewerModel<ITransactionModel> | null = null;

export const TransactionModel = (): SkewerModel<ITransactionModel> => {
  if (!instance) {
    instance = new SkewerModel<ITransactionModel>('Transaction', TransactionSchema);
  }
  return instance;
};
