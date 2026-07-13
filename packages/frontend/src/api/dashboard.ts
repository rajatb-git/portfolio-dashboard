import axios from './axios';

import { DB_HOST } from '@/config';

import { catchCustomError } from './apiUtil';

export type HoldingAggregate = {
  accountId: string;
  name: string;
  symbol: string;
  qty: number;
  averagePrice: number;
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
  timestamp: string; // ISO 8601, unique per calculation
  date: string; // YYYY-MM-DD calendar day
  totalValue: number;
};

export type IndexMovement = {
  symbol: string;
  label: string;
  price: number;
  percentChange: number;
  change: number;
};

export type HoldingMovement = {
  symbol: string;
  name: string;
  percentChange: number;
  dayGL: number;
  marketValue: number;
};

export type AccountMovement = {
  account: string;
  dayGL: number;
  dayGLPercent: number;
  marketValue: number;
};

export type DailyRecap = {
  indices: IndexMovement[];
  holdings: HoldingMovement[];
  accounts: AccountMovement[];
  totalDayGL: number;
  totalDayGLPercent: number;
  marketDay: string;
  marketDayIsToday: boolean;
  generatedAt: string;
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

  getDailyRecap = async (): Promise<DailyRecap> =>
    axios
      .get(DB_HOST + '/dashboard/daily-recap')
      .then((response) => response.data)
      .catch(catchCustomError);
}
