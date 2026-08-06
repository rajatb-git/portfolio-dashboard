import axios from "./axios";

import { DB_HOST } from '@/config';
import type { IAccount } from '@/models/AccountsModel';

import { catchCustomError } from './apiUtil';

export default class AccountsAPI {
  // create
  create = async (account: IAccount): Promise<IAccount> =>
    axios
      .put(DB_HOST + '/accounts', { ...account })
      .then((response) => response.data)
      .catch(catchCustomError);

  // read
  getAll = async (): Promise<Array<IAccount>> =>
    axios(DB_HOST + '/accounts')
      .then((response) => response.data)
      .catch(catchCustomError);

  getById = async (id: string): Promise<IAccount> =>
    axios(DB_HOST + `/accounts/${id}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  // update
  insertOrUpdateById = async (account: IAccount): Promise<IAccount> =>
    axios
      .post(DB_HOST + '/accounts', { ...account })
      .then((response) => response.data)
      .catch(catchCustomError);

  // delete
  deleteById = async (id: string): Promise<IAccount> =>
    axios
      .delete(DB_HOST + '/accounts/' + id)
      .then((response) => response.data)
      .catch(catchCustomError);

  // cash deposit/withdraw
  moveCash = async (
    id: string,
    action: 'deposit' | 'withdraw',
    amount: number,
    date?: string
  ): Promise<{ cashBalance: number }> =>
    axios
      .post(DB_HOST + `/accounts/${id}/cash`, { action, amount, date })
      .then((response) => response.data)
      .catch(catchCustomError);
}
