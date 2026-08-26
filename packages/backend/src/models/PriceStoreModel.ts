import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';

export interface IPriceStore {
  price: number;
  percentChange: number;
  change: number;
  dayHigh: number;
  dayLow: number;
  open: number;
  prevClose: number;
  priceDate: string;
  // Latest pre-market / after-hours print, measured against the regular-session
  // close above. Zeroed (session '') outside extended hours so a stale overnight
  // quote is never presented as live.
  extendedPrice: number;
  extendedChange: number;
  extendedPercentChange: number;
  extendedSession: string;
  extendedAt: string;
}

export const PriceStoreSchema: SchemaType = {
  price: { type: Number, required: true },
  percentChange: { type: Number, required: true },
  change: { type: Number, required: true },
  dayHigh: { type: Number, required: true },
  dayLow: { type: Number, required: true },
  open: { type: Number, required: true },
  prevClose: { type: Number, required: true },
  priceDate: { type: String, required: true },
  extendedPrice: { type: Number, required: false },
  extendedChange: { type: Number, required: false },
  extendedPercentChange: { type: Number, required: false },
  extendedSession: { type: String, required: false },
  extendedAt: { type: String, required: false },
};

export interface IPriceStoreModel extends IPriceStore, ISkewerModel {}

export const PriceStoreDBModel = () => new MongoModel<IPriceStoreModel>('pricestore', PriceStoreSchema);
