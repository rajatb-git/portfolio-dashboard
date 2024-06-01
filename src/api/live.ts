import axios from 'axios';

import { DB_HOST } from '@/config';
import { IPriceStore } from '@/models/PriceStoreModel';

export default class LiveAPI {
  getLivePrice = async (symbol: string): Promise<IPriceStore> =>
    axios(DB_HOST + `/live/quote/${symbol}`).then((response) => {
      return response.data;
    });

  getLiveRecommendation = async (symbol: string): Promise<IPriceStore> =>
    axios(DB_HOST + `/live/recommendation/${symbol}`).then((response) => {
      return response.data;
    });
}
