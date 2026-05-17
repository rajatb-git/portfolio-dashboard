import axios from './axios';

import { DB_HOST } from '@/config';
import { ITransaction } from '@/models/TransactionsModel';

import { catchCustomError } from './apiUtil';

export default class TransactionsAPI {
  create = async (transaction: ITransaction): Promise<ITransaction> =>
    axios
      .put(DB_HOST + '/transactions', { data: transaction })
      .then((response) => response.data)
      .catch(catchCustomError);

  getAll = async (): Promise<Array<ITransaction>> =>
    axios
      .get(DB_HOST + '/transactions')
      .then((response) => response.data)
      .catch(catchCustomError);

  getBySymbol = async (symbol: string): Promise<Array<ITransaction>> =>
    axios
      .get(DB_HOST + `/transactions/symbol/${encodeURIComponent(symbol)}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  getById = async (id: string): Promise<ITransaction> =>
    axios
      .get(DB_HOST + `/transactions/${id}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  insertOrUpdateById = async (transaction: ITransaction): Promise<ITransaction> =>
    axios
      .post(DB_HOST + '/transactions', { ...transaction })
      .then((response) => response.data)
      .catch(catchCustomError);

  deleteById = async (id: string): Promise<ITransaction> =>
    axios
      .delete(DB_HOST + '/transactions', { data: { id } })
      .then((response) => response.data)
      .catch(catchCustomError);
}
