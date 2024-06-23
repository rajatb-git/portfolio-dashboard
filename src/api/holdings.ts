import axios from 'axios';

import { DB_HOST } from '@/config';
import { IHoldings } from '@/models/HoldingsModel';

export default class HoldingsAPI {
  // create
  create = async (holding: IHoldings): Promise<IHoldings> =>
    axios
      .put(DB_HOST + '/holdings', { data: holding })
      .then((response) => response.data)
      .catch((error) => error);

  // read
  getAll = async (): Promise<Array<IHoldings>> =>
    axios(DB_HOST + '/holdings').then((response) => {
      return response.data;
    });
  getById = async (id: string): Promise<IHoldings> =>
    axios(DB_HOST + `/holdings/${id}`)
      .then((response) => response.data)
      .catch((error) => error);

  // update
  updateById = async (holding: IHoldings): Promise<IHoldings> =>
    axios
      .post(DB_HOST + '/holdings', { data: holding })
      .then((response) => response.data)
      .catch((error) => error);

  // delete
  deleteById = async (id: string): Promise<IHoldings> =>
    axios
      .delete(DB_HOST + '/holdings', { data: { id } })
      .then((response) => response.data)
      .catch((error) => error);

  // complete buy transaction
  buyHolding = async (holding: IHoldings): Promise<IHoldings> =>
    axios.post(DB_HOST + '/holdings/buy', holding).then((response) => {
      return response.data;
    });

  // complete sell transaction
  sellHolding = async (holding: IHoldings): Promise<IHoldings> =>
    axios.post(DB_HOST + '/holdings/sell', holding).then((response) => {
      return response.data;
    });

  // file import
  insertHoldings = async (holdingsArray: Array<IHoldings>): Promise<string> => {
    return axios.post(DB_HOST + '/holdings/import', holdingsArray).then((response) => {
      return response.data;
    });
  };
}
