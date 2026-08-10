import { DEFAULT_MONGO_DB_NAME, DEMO_MONGO_DB_NAME } from './mongoClient';
import { ISkewerModel, MongoModel, SchemaType } from './mongoModel';
import { isDemoMode } from './demoMode';

// Collections holding personal financial data are backed by two Mongo
// databases — real and demo. The returned getter picks whichever database
// matches the current demo-mode flag, so every existing call site that
// already re-resolves the model (per request, per background job, per
// seed/reset) becomes mode-aware for free, without threading the flag
// through them.
export const createStorageModel = <T extends ISkewerModel>(
  name: string,
  schema: SchemaType
): (() => MongoModel<T>) => {
  let real: MongoModel<T> | null = null;
  let mock: MongoModel<T> | null = null;

  return (): MongoModel<T> => {
    if (isDemoMode()) {
      if (!mock) mock = new MongoModel<T>(name, schema, DEMO_MONGO_DB_NAME);
      return mock;
    }
    if (!real) real = new MongoModel<T>(name, schema, DEFAULT_MONGO_DB_NAME);
    return real;
  };
};
