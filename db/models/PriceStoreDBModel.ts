import { IModelDB, DBModel } from 'db/ModelProto';

export interface IPriceStore {
  sym: string;
  price: number;
  updatedAt: Date;
}

export interface IPriceStoreModel extends IPriceStore, IModelDB {}

export const PriceStoreDBModel = () => new DBModel<IPriceStoreModel>('pricestore');
