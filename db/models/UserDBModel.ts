import { IModelDB, DBModel } from '../ModelProto';

export interface IUserDB {
  userId: string;
  name: string;
}

export interface IUserDBModel extends IUserDB, IModelDB {}

export const UsersDBModel = () => new DBModel<IUserDBModel>('users');
