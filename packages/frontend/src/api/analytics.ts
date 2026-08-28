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

export type HoldingEarningResult = {
  symbol: string;
  name: string;
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  surprisePercent: number | null;
  daysAgo: number;
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

export type HarvestCandidate = {
  symbol: string;
  name: string;
  accountId: string;
  type: 'stock' | 'crypto';
  qty: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedLoss: number;
  lossPercent: number;
  term: 'short' | 'long';
  washSaleRisk: boolean;
  washSaleClearDate: string | null;
};

export type TaxLossHarvesting = {
  candidates: HarvestCandidate[];
  totalUnrealizedLoss: number;
  harvestableNow: number;
  shortTermLoss: number;
  longTermLoss: number;
};

export type MonthlyReturn = {
  year: number;
  month: number;
  return: number | null;
};

export type MonthlyReturns = {
  months: MonthlyReturn[];
  yearlyReturns: Array<{ year: number; return: number }>;
  bestMonth: { year: number; month: number; return: number } | null;
  worstMonth: { year: number; month: number; return: number } | null;
  firstYear: number | null;
  lastYear: number | null;
};

export type CorrelationMatrix = {
  symbols: string[];
  matrix: number[][];
  avgCorrelation: number;
  diversificationScore: number;
  mostCorrelated: { a: string; b: string; value: number } | null;
  leastCorrelated: { a: string; b: string; value: number } | null;
  skipped: string[];
};

export type GoalProgress = {
  label: string;
  targetValue: number;
  targetDate: string | null;
  currentValue: number;
  progressPercent: number;
  remaining: number;
  monthlyGrowthRate: number | null;
  projectedDate: string | null;
  monthsToProjected: number | null;
  onTrack: boolean | null;
  requiredMonthlyReturn: number | null;
};

export type GoalConfig = {
  label: string;
  targetValue: number;
  targetDate: string | null;
};

export type HoldingDividend = {
  symbol: string;
  name: string;
  qty: number;
  averagePrice: number;
  amountPerShare: number;
  annualizedDividend: number;
  yieldPercent: number;
  yieldOnCostPercent: number;
  annualIncome: number;
  nextExDate: string;
  nextPayDate: string;
  nextPaymentAmount: number;
};

export type DividendSummary = {
  holdings: HoldingDividend[];
  totalAnnualIncome: number;
  averageMonthlyIncome: number;
  portfolioYieldOnCostPercent: number;
  upcoming: Array<{ symbol: string; name: string; date: string; amount: number; event: 'ex_dividend' | 'payment' }>;
  payerCount: number;
  generatedAt: string;
};

export default class AnalyticsAPI {
  getDividends = async (): Promise<DividendSummary> =>
    axios
      .get(DB_HOST + '/analytics/dividends')
      .then((response) => response.data)
      .catch(catchCustomError);

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

  getEarningsResults = async (): Promise<HoldingEarningResult[]> =>
    axios
      .get(DB_HOST + '/analytics/earnings-results')
      .then((response) => response.data)
      .catch(catchCustomError);

  getPortfolioInsights = async (): Promise<PortfolioInsight> =>
    axios
      .post(DB_HOST + '/analytics/portfolio-insights')
      .then((response) => response.data)
      .catch(catchCustomError);

  getTaxLossHarvesting = async (): Promise<TaxLossHarvesting> =>
    axios
      .get(DB_HOST + '/analytics/tax-loss-harvesting')
      .then((response) => response.data)
      .catch(catchCustomError);

  getMonthlyReturns = async (): Promise<MonthlyReturns> =>
    axios
      .get(DB_HOST + '/analytics/monthly-returns')
      .then((response) => response.data)
      .catch(catchCustomError);

  getCorrelation = async (): Promise<CorrelationMatrix> =>
    axios
      .get(DB_HOST + '/analytics/correlation')
      .then((response) => response.data)
      .catch(catchCustomError);

  getGoalProgress = async (): Promise<GoalProgress> =>
    axios
      .get(DB_HOST + '/analytics/goal')
      .then((response) => response.data)
      .catch(catchCustomError);

  getGoalConfig = async (): Promise<GoalConfig> =>
    axios
      .get(DB_HOST + '/analytics/goal/config')
      .then((response) => response.data)
      .catch(catchCustomError);

  saveGoalConfig = async (config: GoalConfig): Promise<GoalConfig> =>
    axios
      .post(DB_HOST + '/analytics/goal/config', config)
      .then((response) => response.data)
      .catch(catchCustomError);
}
