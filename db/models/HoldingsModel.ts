import { IModel, Model } from 'db/ModelProto';

export interface IHoldings {
  id: string;
  userId: string;
  name: string;
  symbol: string;
  qty: number;
  averagePrice: number;
  targetPrice: number;
  type: 'stock' | 'crypto';
  currentPrice?: number;
  percentChange?: number;
  dayHigh?: number;
  dayLow?: number;
  totalGL?: number;
  totalGLPercent?: number;
  marketValue?: number;
  priceDate?: String;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHoldingsModel extends IHoldings, IModel {}

export const HoldingsModel = () => new Model<IHoldingsModel>('holdings');
