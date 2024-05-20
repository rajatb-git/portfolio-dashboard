import axios from 'axios';

import { DB_HOST } from '@/config';
import { IUser } from '@/models/UserModel';

export default class UserAPI {
  getAllUsers = async (): Promise<Array<IUser>> =>
    axios(DB_HOST + '/users')
      .then((response) => response.data)
      .catch((error) => error);
}
