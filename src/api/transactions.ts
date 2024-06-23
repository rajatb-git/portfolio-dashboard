import axios from 'axios';

import { DB_HOST } from '@/config';
import { ITransaction } from '@/models/TransactionsModel';

export default class TransactionsAPI {
  // create
  create = async (transaction: ITransaction): Promise<ITransaction> =>
    axios
      .put(DB_HOST + '/transactions', { data: transaction })
      .then((response) => response.data)
      .catch((error) => error);

  // read
  getAll = async (): Promise<Array<ITransaction>> =>
    axios
      .get(DB_HOST + '/transactions')
      .then((response) => response.data)
      .catch((error) => error);
  getById = async (id: string): Promise<ITransaction> =>
    axios
      .get(DB_HOST + `/transactions/${id}`)
      .then((response) => response.data)
      .catch((error) => error);

  // update
  updateById = async (transaction: ITransaction): Promise<ITransaction> =>
    axios
      .post(DB_HOST + '/transactions', { data: transaction })
      .then((response) => response.data)
      .catch((error) => error);

  // delete
  deleteById = async (id: string): Promise<ITransaction> =>
    axios
      .delete(DB_HOST + '/transactions', { data: { id } })
      .then((response) => response.data)
      .catch((error) => error);
}
