export interface ITransaction {
  id: string;
  userId: string;
  symbol: string;
  qty: number;
  price: number;
  type: 'stock' | 'crypto';
  action: string;
  createdAt: string;
}
