export interface IHoldings {
  id: string;
  userId: string;
  name: string;
  symbol: string;
  qty: number;
  averagePrice: number;
  targetPrice: number;
  type: 'stock' | 'crypto';
  createdAt?: Date;
  updatedAt?: Date;
}
