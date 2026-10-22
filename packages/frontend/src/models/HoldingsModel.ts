export interface ITaxLot {
  id: string;
  qty: number;
  price: number;
  date: string;
  // Purchase date and/or cost were inferred rather than recorded from a trade.
  estimated?: boolean;
}

export interface IHoldings {
  id: string;
  accountId: string;
  name: string;
  symbol: string;
  qty: number;
  averagePrice: number;
  type: 'stock' | 'crypto';
  lots?: ITaxLot[];
  createdAt?: string;
  updatedAt?: string;
}
