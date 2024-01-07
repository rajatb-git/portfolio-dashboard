import { IModel, Model } from 'db/ModelProto';

export interface IUser {
  userId: string;
  name: string;
  displayName: string;
}

export interface IUserModel extends IUser, IModel {}

export const UsersModel = new Model<IUserModel>('users');
