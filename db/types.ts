export type HoldingsDBType = {
  userId: string;
  name: string;
  symbol: string;
  qty: number;
  purchasePrice: number;
  targetPrice: number;
  type: 'stock' | 'crypto';
  createdAt: Date;
  updatedAt: Date;
};

export type PriceStoreDBType = {
  sym: string;
  price: number;
  updatedAt: Date;
};

export type UserDBType = {
  userId: string;
  name: string;
  displayName: string;
};
