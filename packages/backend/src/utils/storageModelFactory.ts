import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

import { isDemoMode, MOCK_STORAGE_DIR } from './demoMode';
import { STORAGE_DIR } from './storage';

// Collections holding personal financial data are backed by two on-disk
// stores — real and mock. The returned getter picks whichever store matches
// the current demo-mode flag, so every existing call site that already
// re-resolves the model (per request, per background job, per seed/reset)
// becomes mode-aware for free, without threading the flag through them.
export const createStorageModel = <T extends ISkewerModel>(
  name: string,
  schema: SchemaType
): (() => SkewerModel<T>) => {
  let real: SkewerModel<T> | null = null;
  let mock: SkewerModel<T> | null = null;

  return (): SkewerModel<T> => {
    if (isDemoMode()) {
      if (!mock) mock = new SkewerModel<T>(name, schema, MOCK_STORAGE_DIR);
      return mock;
    }
    if (!real) real = new SkewerModel<T>(name, schema, STORAGE_DIR);
    return real;
  };
};
