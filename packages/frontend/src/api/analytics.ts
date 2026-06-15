import axios from './axios';

import { DB_HOST } from '@/config';
import { catchCustomError } from './apiUtil';

export type RiskMetrics = {
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPeriod: { from: string; to: string };
  beta: number;
  bestDay: { date: string; return: number };
  worstDay: { date: string; return: number };
  totalDataDays: number;
};

export type SectorAllocation = {
  sector: string;
  marketValue: number;
  percentage: number;
};

export default class AnalyticsAPI {
  getRiskMetrics = async (): Promise<RiskMetrics> =>
    axios
      .get(DB_HOST + '/analytics/risk')
      .then((response) => response.data)
      .catch(catchCustomError);

  getSectorAllocation = async (): Promise<SectorAllocation[]> =>
    axios
      .get(DB_HOST + '/analytics/sectors')
      .then((response) => response.data)
      .catch(catchCustomError);

  getPerformanceAttribution = async (): Promise<any> =>
    axios
      .get(DB_HOST + '/analytics/performance-attribution')
      .then((response) => response.data)
      .catch(catchCustomError);
}
