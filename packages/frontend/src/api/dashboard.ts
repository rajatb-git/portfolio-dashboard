import axios from './axios';

import { DB_HOST } from '@/config';

import { catchCustomError } from './apiUtil';

export type HoldingAggregate = {
  accountId: string;
  name: string;
  symbol: string;
  qty: number;
  averagePrice: number;
  targetPrice: number;
  type: 'stock' | 'crypto';
  currentPrice: number;
  priceDate: string;
  percentChange: number;
  dayHigh: number;
  dayLow: number;
  originalValue: number;
  totalGL: number;
  totalGLPercent: number;
  marketValue: number;
  buy: number;
  hold: number;
  sell: number;
  strongBuy: number;
  strongSell: number;
};

export type PortfolioSnapshot = {
  date: string; // YYYY-MM-DD
  totalValue: number;
};

export class DashboardAPI {
  getDashboard = async (): Promise<Array<HoldingAggregate>> =>
    axios
      .get(DB_HOST + `/dashboard`)
      .then((response) => {
        return response.data;
      })
      .catch(catchCustomError);

  getSnapshots = async (): Promise<Array<PortfolioSnapshot>> =>
    axios
      .get(DB_HOST + '/portfolio/snapshots')
      .then((response) => response.data)
      .catch(catchCustomError);
}
