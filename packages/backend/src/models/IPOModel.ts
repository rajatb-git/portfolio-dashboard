import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface IIPO {
  date: string;
  exchange: string;
  name: string;
  numberOfShares: number;
  price: string;
  status: string;
  symbol: string;
  totalSharesValue: number;
}

export const IPOSchema: SchemaType = {
  date: { type: String },
  exchange: { type: String },
  name: { type: String },
  numberOfShares: { type: Number },
  price: { type: String },
  status: { type: String },
  symbol: { type: String },
  totalSharesValue: { type: Number },
};

export interface IIPOModel extends IIPO, ISkewerModel {}

export const IPODBModel = () => new SkewerModel<IIPOModel>('ipos', IPOSchema);
