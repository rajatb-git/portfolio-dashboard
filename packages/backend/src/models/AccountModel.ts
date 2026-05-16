import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface IAccount {
  name: string;
  cashBalance?: number;
}

export const AccountSchema: SchemaType = {
  name: { type: String, required: true },
  cashBalance: { type: Number, required: false },
};

export interface IAccountModel extends IAccount, ISkewerModel {}

let instance: SkewerModel<IAccountModel> | null = null;

export const AccountModel = (): SkewerModel<IAccountModel> => {
  if (!instance) {
    instance = new SkewerModel<IAccountModel>('accounts', AccountSchema);
  }
  return instance;
};
