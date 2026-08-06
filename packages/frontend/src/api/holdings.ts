import axios from './axios';

import { DB_HOST } from '@/config';
import { IHoldings } from '@/models/HoldingsModel';
import { HoldingAggregate } from './dashboard';
import { catchCustomError } from './apiUtil';

// `date` is the day the trade actually happened, which can predate the entry.
export type TradePayload = Pick<IHoldings, 'accountId' | 'name' | 'symbol' | 'qty' | 'averagePrice' | 'type'> & {
  date?: string;
};

export default class HoldingsAPI {
  // create
  create = async (holding: IHoldings): Promise<IHoldings> =>
    axios
      .put(DB_HOST + '/holdings', { data: holding })
      .then((response) => response.data)
      .catch(catchCustomError);

  // read
  getAll = async (): Promise<Array<IHoldings>> =>
    axios(DB_HOST + '/holdings')
      .then((response) => {
        return response.data;
      })
      .catch(catchCustomError);

  getById = async (id: string): Promise<IHoldings> =>
    axios(DB_HOST + `/holdings/${id}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  // update
  insertOrUpdateById = async (holding: IHoldings): Promise<IHoldings> =>
    axios
      .post(DB_HOST + '/holdings', { ...holding })
      .then((response) => response.data)
      .catch(catchCustomError);

  // delete
  deleteById = async (id: string): Promise<IHoldings> =>
    axios
      .delete(DB_HOST + `/holdings/${id}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  // complete buy transaction
  buyHolding = async (holding: TradePayload): Promise<IHoldings> =>
    axios
      .post(DB_HOST + '/holdings/buy', holding)
      .then((response) => {
        return response.data;
      })
      .catch(catchCustomError);

  // complete sell transaction
  sellHolding = async (holding: TradePayload): Promise<IHoldings> =>
    axios
      .post(DB_HOST + '/holdings/sell', holding)
      .then((response) => {
        return response.data;
      })
      .catch(catchCustomError);

  getBySymbol = async (symbol: string): Promise<Array<HoldingAggregate>> =>
    axios
      .get(DB_HOST + `/holdings/symbol/${encodeURIComponent(symbol)}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  // file import
  insertHoldings = async (holdingsArray: Array<IHoldings>): Promise<string> => {
    return axios
      .post(DB_HOST + '/holdings/import', holdingsArray)
      .then((response) => {
        return response.data;
      })
      .catch(catchCustomError);
  };
}
