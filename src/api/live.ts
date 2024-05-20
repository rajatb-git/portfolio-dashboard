import axios from 'axios';

import { DB_HOST } from '@/config';
import { IPriceStore } from '@/models/PriceStoreModel';

export default class LiveAPI {
  getLivePrice = async (symbol: string): Promise<IPriceStore> =>
    axios(DB_HOST + `/live/${symbol}`).then((response) => {
      return response.data;
    });
}
