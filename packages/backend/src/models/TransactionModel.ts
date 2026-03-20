import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface ITransaction {
  accountId: string;
  symbol: string;
  qty: number;
  price: number;
  type: 'stock' | 'crypto';
  action: string;
}

export const TransactionSchema: SchemaType = {
  accountId: { type: String, required: true },
  symbol: { type: String, required: false },
  qty: { type: Number, required: true },
  price: { type: Number, required: false },
  type: { type: String, enum: ['stock', 'crypto'], required: true },
  action: { type: String, required: true },
};

export interface ITransactionModel extends ITransaction, ISkewerModel {}

export const TransactionModel = () => new SkewerModel<ITransactionModel>('Transaction', TransactionSchema);
