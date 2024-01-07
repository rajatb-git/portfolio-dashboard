import { IModel, Model } from 'db/ModelProto';

export interface IPriceStore {
  sym: string;
  price: number;
  updatedAt: Date;
}

export interface IPriceStoreModel extends IPriceStore, IModel {}

export const PriceStoreModel = new Model<IPriceStoreModel>('pricestore');
