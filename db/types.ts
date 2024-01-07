export type HoldingsType = {
  userId: string;
  name: string;
  symbol: string;
  qty: number;
  purchasePrice: number;
  targetPrice: number;
  type: "stock" | "crypto";
  createdAt: Date;
  updatedAt: Date;
};

export type PriceStoreType = {
    sym: string;
    price: number;
    updatedAt: Date;
}

export type UserType = {
  userId: string;
  name: string;
  displayName: string;
};
