import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface IPriceStore {
  price: number;
  percentChange: number;
  change: number;
  dayHigh: number;
  dayLow: number;
  open: number;
  prevClose: number;
  priceDate: string;
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
};

export interface IPriceStoreModel extends IPriceStore, ISkewerModel {}

export const PriceStoreDBModel = () => new SkewerModel<IPriceStoreModel>('pricestore', PriceStoreSchema);
