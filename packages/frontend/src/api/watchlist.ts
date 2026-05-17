import axios from './axios';

import { DB_HOST } from '@/config';
import { catchCustomError } from './apiUtil';

export default class WatchlistAPI {
  getAll = async (): Promise<any[]> =>
    axios.get(DB_HOST + '/watchlist')
      .then((res) => res.data)
      .catch(catchCustomError);

  add = async (symbol: string): Promise<any> =>
    axios.post(DB_HOST + `/watchlist/${symbol}`)
      .then((res) => res.data)
      .catch(catchCustomError);

  remove = async (symbol: string): Promise<any> =>
    axios.delete(DB_HOST + `/watchlist/${symbol}`)
      .then((res) => res.data)
      .catch(catchCustomError);
}
