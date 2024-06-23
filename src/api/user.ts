import axios from 'axios';

import { DB_HOST } from '@/config';
import { IUser } from '@/models/UserModel';

export default class UserAPI {
  // create
  create = async (user: IUser): Promise<IUser> =>
    axios
      .put(DB_HOST + '/users', { data: user })
      .then((response) => response.data)
      .catch((error) => error);

  // read
  getAll = async (): Promise<Array<IUser>> =>
    axios(DB_HOST + '/users')
      .then((response) => response.data)
      .catch((error) => error);
  getById = async (id: string): Promise<IUser> =>
    axios(DB_HOST + `/users/${id}`)
      .then((response) => response.data)
      .catch((error) => error);

  // update
  updateById = async (user: IUser): Promise<IUser> =>
    axios
      .post(DB_HOST + '/users', { data: user })
      .then((response) => response.data)
      .catch((error) => error);

  // delete
  deleteById = async (id: string): Promise<IUser> =>
    axios
      .delete(DB_HOST + '/users', { data: { id } })
      .then((response) => response.data)
      .catch((error) => error);
}
