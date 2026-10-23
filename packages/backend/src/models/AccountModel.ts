import { ISkewerModel, SchemaType } from '../utils/mongoModel';

import { createStorageModel } from '../utils/storageModelFactory';

// How gains in the account are taxed. Only taxable accounts owe tax on a sale
// or can harvest a loss; a missing value predates the field and means taxable.
export type AccountTaxType = 'taxable' | 'taxDeferred' | 'taxFree';
export const ACCOUNT_TAX_TYPES: AccountTaxType[] = ['taxable', 'taxDeferred', 'taxFree'];

export interface IAccount {
  name: string;
  cashBalance?: number;
  taxType?: AccountTaxType;
}

export const AccountSchema: SchemaType = {
  name: { type: String, required: true },
  cashBalance: { type: Number, required: false },
  taxType: { type: String, enum: ACCOUNT_TAX_TYPES, required: false },
};

export const isTaxableAccount = (account: Pick<IAccount, 'taxType'> | undefined): boolean =>
  (account?.taxType ?? 'taxable') === 'taxable';

export interface IAccountModel extends IAccount, ISkewerModel {}

export const AccountModel = createStorageModel<IAccountModel>('accounts', AccountSchema);
