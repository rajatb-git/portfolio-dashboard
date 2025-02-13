import axios, { AxiosError } from 'axios';

import { DB_HOST } from '@/config';
import { IUser } from '@/models/UserModel';

import { catchCustomError } from './apiUtil';

export default class UserAPI {
  // create
  create = async (user: IUser): Promise<IUser> =>
    axios
      .put(DB_HOST + '/users', { ...user })
      .then((response) => response.data)
      .catch(catchCustomError);

  // read
  getAll = async (): Promise<Array<IUser>> =>
    axios(DB_HOST + '/users')
      .then((response) => response.data)
      .catch(catchCustomError);

  getById = async (id: string): Promise<IUser> =>
    axios(DB_HOST + `/users/${id}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  // update
  insertOrUpdateById = async (user: IUser): Promise<IUser> =>
    axios
      .post(DB_HOST + '/users', { ...user })
      .then((response) => response.data)
      .catch(catchCustomError);

  // delete
  deleteById = async (id: string): Promise<IUser> =>
    axios
      .delete(DB_HOST + '/users/' + id)
      .then((response) => response.data)
      .catch(catchCustomError);
}
