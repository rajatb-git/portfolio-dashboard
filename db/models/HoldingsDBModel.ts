import { IModelDB, DBModel } from '../ModelProto';

export interface IHoldingsDB {
  id: string;
  userId: string;
  name: string;
  symbol: string;
  qty: number;
  averagePrice: number;
  targetPrice: number;
  type: 'stock' | 'crypto';
  createdAt: Date;
  updatedAt: Date;
}

export interface IHoldingsDBModel extends IHoldingsDB, IModelDB {}

export const HoldingsDBModel = () => new DBModel<IHoldingsDBModel>('holdings');
