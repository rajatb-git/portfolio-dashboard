import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface IAccount {
  name: string;
}

export const AccountSchema: SchemaType = {
  name: { type: String, required: true },
};

export interface IAccountModel extends IAccount, ISkewerModel {}

export const AccountModel = () => new SkewerModel<IAccountModel>('accounts', AccountSchema);
