import axios from 'axios';

import { DB_HOST } from '@/config';
import { catchCustomError } from './apiUtil';

export type DividendRecord = {
  id: string;
  holdingSymbol: string;
  accountId: string;
  amount: number;
  date: string;
  type: 'regular' | 'special' | 'qualified';
  shares: number;
};

export type DividendHoldingSummary = {
  symbol: string;
  annualDividend: number;
  yield: number;
  lastPayDate: string;
  currentPrice: number;
};

export type DividendSummary = {
  ytdIncome: number;
  projectedAnnualIncome: number;
  portfolioYield: number;
  monthlyIncome: number;
  byHolding: DividendHoldingSummary[];
  monthlyHistory: Array<{ month: string; income: number }>;
};

export default class DividendAPI {
  getSummary = async (): Promise<DividendSummary> =>
    axios
      .get(DB_HOST + '/dividends/summary')
      .then((response) => response.data)
      .catch(catchCustomError);

  getAll = async (): Promise<DividendRecord[]> =>
    axios
      .get(DB_HOST + '/dividends')
      .then((response) => response.data)
      .catch(catchCustomError);

  getBySymbol = async (symbol: string): Promise<DividendRecord[]> =>
    axios
      .get(DB_HOST + `/dividends/${symbol}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  addDividend = async (data: Omit<DividendRecord, 'id'>): Promise<DividendRecord> =>
    axios
      .put(DB_HOST + '/dividends', data)
      .then((response) => response.data)
      .catch(catchCustomError);

  deleteDividend = async (id: string): Promise<void> =>
    axios
      .delete(DB_HOST + `/dividends/${id}`)
      .then((response) => response.data)
      .catch(catchCustomError);
}
