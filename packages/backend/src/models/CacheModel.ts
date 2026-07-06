import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface ICache {
  key: string;
  value: string;
}

export const CacheSchema: SchemaType = {
  key: { type: String },
  value: { type: String },
};

export interface ICacheModel extends ICache, ISkewerModel {}

export const CacheDBModel = () => new SkewerModel<ICacheModel>('cache', CacheSchema);
