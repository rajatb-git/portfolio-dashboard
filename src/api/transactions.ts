import axios from 'axios';

import { DB_HOST } from '@/config';
import { ITransaction } from '@/models/TransactionsModel';

export default class TransactionsAPI {
  getAllTransactions = async (): Promise<Array<ITransaction>> =>
    axios
      .get(DB_HOST + '/transactions')
      .then((response) => response.data)
      .catch((error) => error);

  getTransaction = async (id: string): Promise<Array<ITransaction>> =>
    axios
      .get(DB_HOST + `/transactions/${id}`)
      .then((response) => response.data)
      .catch((error) => error);

  deleteTransaction = async (id: string): Promise<Array<ITransaction>> =>
    axios
      .delete(DB_HOST + '/transactions', { data: { id } })
      .then((response) => response.data)
      .catch((error) => error);
}
