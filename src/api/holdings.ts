import axios from 'axios';

import { DB_HOST } from '@/config';
import { IHoldings } from '@/models/HoldingsModel';

export default class HoldingsAPI {
  getAllHoldings = async (): Promise<Array<IHoldings>> =>
    axios(DB_HOST + '/holdings').then((response) => {
      return response.data;
    });

  insertHoldings = async (holdingsArray: Array<IHoldings>): Promise<string> => {
    console.log(holdingsArray);
    return axios.post(DB_HOST + '/holdings/import', holdingsArray).then((response) => {
      return response.data;
    });
  };

  deleteHoldingById = async (recordId: string): Promise<IHoldings> =>
    axios
      .delete(DB_HOST + '/holdings', { data: { recordId } })
      .then((response) => response.data)
      .catch((error) => error);

  sellHolding = async (holding: IHoldings): Promise<IHoldings> =>
    axios.post(DB_HOST + '/holdings/sell', holding).then((response) => {
      return response.data;
    });

  buyHolding = async (holding: IHoldings): Promise<IHoldings> =>
    axios.post(DB_HOST + '/holdings/buy', holding).then((response) => {
      return response.data;
    });
}
