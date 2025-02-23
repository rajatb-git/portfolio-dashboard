export interface IHoldings {
  id: string;
  accountId: string;
  name: string;
  symbol: string;
  qty: number;
  averagePrice: number;
  targetPrice: number;
  type: 'stock' | 'crypto';
  createdAt?: string;
  updatedAt?: string;
}
