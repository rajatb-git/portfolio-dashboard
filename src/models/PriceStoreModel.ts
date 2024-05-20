export interface IPriceStore {
  id: string;
  sym: string;
  price: number;
  percentChange: number;
  dayHigh: number;
  dayLow: number;
  priceDate: string;
  createdAt: string;
  updatedAt: string;
}
