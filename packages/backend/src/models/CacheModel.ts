import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';

export interface ICache {
  key: string;
  value: string;
}

export const CacheSchema: SchemaType = {
  key: { type: String },
  value: { type: String },
};

export interface ICacheModel extends ICache, ISkewerModel {}

export const CacheDBModel = () => new MongoModel<ICacheModel>('cache', CacheSchema);
