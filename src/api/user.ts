import { IUserDBModel, UsersDBModel } from 'db/models/UserDBModel';

export const getUserData = async (): Promise<[Error | null, Array<IUserDBModel> | null]> => {
  try {
    const users = UsersDBModel();

    return [null, users.getAllRecords()];
  } catch (err: any) {
    return [err as Error, null];
  }
};
