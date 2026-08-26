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
  // Latest pre-market / after-hours print, relative to the regular-session close.
  // Absent or zeroed outside extended hours.
  extendedPrice?: number;
  extendedChange?: number;
  extendedPercentChange?: number;
  extendedSession?: string;
  extendedAt?: string;
  createdAt: string;
  updatedAt: string;
}
