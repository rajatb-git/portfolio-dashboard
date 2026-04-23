export interface IPriceStore {
  id: string;
  sym: string;
  price: number;
  percentChange: number;
  change?: number;
  dayHigh: number;
  dayLow: number;
  open?: number;
  prevClose?: number;
  priceDate: string;
  createdAt: string;
  updatedAt: string;
}
