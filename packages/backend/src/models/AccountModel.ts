import { ISkewerModel, SchemaType } from '../utils/mongoModel';

import { createStorageModel } from '../utils/storageModelFactory';

export interface IAccount {
  name: string;
  cashBalance?: number;
}

export const AccountSchema: SchemaType = {
  name: { type: String, required: true },
  cashBalance: { type: Number, required: false },
};

export interface IAccountModel extends IAccount, ISkewerModel {}

export const AccountModel = createStorageModel<IAccountModel>('accounts', AccountSchema);
