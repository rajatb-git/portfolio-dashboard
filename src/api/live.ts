import axios from 'axios';

import { DB_HOST } from '@/config';
import { IIPO } from '@/models/IPOModel';
import { IMarketNews } from '@/models/MarketNews';
import { IPriceStore } from '@/models/PriceStoreModel';
import { IRecommendation } from '@/models/RecommendationModel';

export type Range = '1d' | '5d' | '1M' | '3M' | '6M' | '1y' | '2y' | '3y';

export default class LiveAPI {
  getLivePrice = async (symbol: string): Promise<IPriceStore> =>
    axios(DB_HOST + `/live/quote/${symbol}`).then((response) => {
      return response.data;
    });

  getLiveRecommendation = async (symbol: string): Promise<IRecommendation> =>
    axios(DB_HOST + `/live/recommendation/${symbol}`).then((response) => {
      return response.data;
    });

  getLiveNews = async (symbol: string): Promise<Array<IMarketNews>> =>
    axios(DB_HOST + `/live/news/${symbol}`).then((response) => {
      return response.data;
    });

  getPriceHistory = async (symbol: string, timePeriod: Range): Promise<Array<[number, number]>> =>
    axios(DB_HOST + `/live/history/${symbol}?range=${timePeriod}`).then((response) => {
      return response.data;
    });

  getIPOs = async (): Promise<Array<IIPO>> =>
    axios(DB_HOST + '/live/ipos').then((response) => {
      return response.data;
    });
}
