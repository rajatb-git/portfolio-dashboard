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

export type RealizedLot = {
  symbol: string;
  acquiredDate: string;
  soldDate: string;
  qty: number;
  proceeds: number;
  costBasis: number;
  gain: number;
  term: 'short' | 'long';
  year: number;
};

export type YearSummary = {
  year: number;
  proceeds: number;
  costBasis: number;
  gain: number;
  shortTermGain: number;
  longTermGain: number;
  count: number;
};

export type RealizedGains = {
  lots: RealizedLot[];
  byYear: YearSummary[];
  totals: Omit<YearSummary, 'year'>;
  unmatchedSells: number;
};

export type HoldingEarning = {
  symbol: string;
  name: string;
  date: string;
  hour: string | null;
  epsEstimate: number | null;
  revenueEstimate: number | null;
  daysAway: number;
};

export type PortfolioInsight = {
  summary: string;
  observations: string[];
  risks: string[];
  suggestions: string[];
  provider: string;
  model: string;
  generatedAt: string;
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

  getRealizedGains = async (): Promise<RealizedGains> =>
    axios
      .get(DB_HOST + '/analytics/realized-gains')
      .then((response) => response.data)
      .catch(catchCustomError);

  getEarningsCalendar = async (): Promise<HoldingEarning[]> =>
    axios
      .get(DB_HOST + '/analytics/earnings-calendar')
      .then((response) => response.data)
      .catch(catchCustomError);

  getPortfolioInsights = async (): Promise<PortfolioInsight> =>
    axios
      .post(DB_HOST + '/analytics/portfolio-insights')
      .then((response) => response.data)
      .catch(catchCustomError);
}
