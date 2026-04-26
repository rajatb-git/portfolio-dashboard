import moment from 'moment';
import { getPriceHistoryAreaChart } from '../externalApis/nasdaq';
import { IPortfolioSnapshotModel, PortfolioSnapshotDBModel } from '../models/PortfolioSnapshotModel';
import { logger } from '../utils/winston';

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

const RISK_FREE_RATE = 0.05; // 5% annual risk-free rate
const TRADING_DAYS_PER_YEAR = 252;

export const calculateRiskMetrics = async (): Promise<RiskMetrics> => {
  const snapshotModel = await PortfolioSnapshotDBModel().initialize();
  const allSnapshots = snapshotModel.getAllRecords();
  const sorted = [...allSnapshots].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length < 2) {
    return {
      annualizedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPeriod: { from: '', to: '' },
      beta: 0,
      bestDay: { date: '', return: 0 },
      worstDay: { date: '', return: 0 },
      totalDataDays: sorted.length,
    };
  }

  // Calculate daily returns
  const dailyReturns: Array<{ date: string; return: number }> = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].totalValue;
    const curr = sorted[i].totalValue;
    if (prev > 0) {
      dailyReturns.push({
        date: sorted[i].date,
        return: (curr - prev) / prev,
      });
    }
  }

  if (dailyReturns.length === 0) {
    return {
      annualizedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPeriod: { from: '', to: '' },
      beta: 0,
      bestDay: { date: '', return: 0 },
      worstDay: { date: '', return: 0 },
      totalDataDays: sorted.length,
    };
  }

  // Annualized return
  const totalReturn = (sorted[sorted.length - 1].totalValue - sorted[0].totalValue) / sorted[0].totalValue;
  const daySpan = moment(sorted[sorted.length - 1].date).diff(moment(sorted[0].date), 'days');
  const annualizedReturn = daySpan > 0 ? (1 + totalReturn) ** (365 / daySpan) - 1 : 0;

  // Volatility (annualized std dev of daily returns)
  const meanReturn = dailyReturns.reduce((s, r) => s + r.return, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((s, r) => s + (r.return - meanReturn) ** 2, 0) / (dailyReturns.length - 1);
  const dailyVol = Math.sqrt(variance);
  const volatility = dailyVol * Math.sqrt(TRADING_DAYS_PER_YEAR);

  // Sharpe Ratio
  const sharpeRatio = volatility > 0 ? (annualizedReturn - RISK_FREE_RATE) / volatility : 0;

  // Max Drawdown
  let peak = sorted[0].totalValue;
  let maxDrawdown = 0;
  // const drawdownFrom = sorted[0].date;
  let maxDrawdownPeriod = { from: sorted[0].date, to: sorted[0].date };
  let currentDrawdownStart = sorted[0].date;

  for (const snap of sorted) {
    if (snap.totalValue > peak) {
      peak = snap.totalValue;
      currentDrawdownStart = snap.date;
    }
    const drawdown = (peak - snap.totalValue) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPeriod = { from: currentDrawdownStart, to: snap.date };
    }
  }

  // Best/Worst day
  const bestDay = dailyReturns.reduce((best, r) => (r.return > best.return ? r : best), dailyReturns[0]);
  const worstDay = dailyReturns.reduce((worst, r) => (r.return < worst.return ? r : worst), dailyReturns[0]);

  // Beta vs SPY
  let beta = 0;
  try {
    const spyData = await getPriceHistoryAreaChart('SPY', '1y');
    if (spyData && spyData.length > 1) {
      // spyData is [[timestamp, close], ...]
      const spySorted = [...spyData].sort((a: number[], b: number[]) => a[0] - b[0]);
      const spyReturns = new Map<string, number>();
      for (let i = 1; i < spySorted.length; i++) {
        const date = moment(spySorted[i][0]).format('YYYY-MM-DD');
        const prev = spySorted[i - 1][1];
        const curr = spySorted[i][1];
        if (prev > 0) {
          spyReturns.set(date, (curr - prev) / prev);
        }
      }

      // Match portfolio returns with SPY returns by date
      const paired: Array<{ portfolio: number; spy: number }> = [];
      for (const dr of dailyReturns) {
        const spyReturn = spyReturns.get(dr.date);
        if (spyReturn !== undefined) {
          paired.push({ portfolio: dr.return, spy: spyReturn });
        }
      }

      if (paired.length > 1) {
        const meanP = paired.reduce((s, p) => s + p.portfolio, 0) / paired.length;
        const meanS = paired.reduce((s, p) => s + p.spy, 0) / paired.length;
        const covariance =
          paired.reduce((s, p) => s + (p.portfolio - meanP) * (p.spy - meanS), 0) / (paired.length - 1);
        const spyVariance = paired.reduce((s, p) => s + (p.spy - meanS) ** 2, 0) / (paired.length - 1);
        beta = spyVariance > 0 ? covariance / spyVariance : 0;
      }
    }
  } catch (err: any) {
    logger.log({
      level: 'error',
      label: 'RiskAnalytics',
      message: `Failed to calculate beta: ${err}`,
    });
  }

  return {
    annualizedReturn: +(annualizedReturn * 100).toFixed(2),
    volatility: +(volatility * 100).toFixed(2),
    sharpeRatio: +sharpeRatio.toFixed(2),
    maxDrawdown: +(maxDrawdown * 100).toFixed(2),
    maxDrawdownPeriod,
    beta: +beta.toFixed(2),
    bestDay: { date: bestDay.date, return: +(bestDay.return * 100).toFixed(2) },
    worstDay: {
      date: worstDay.date,
      return: +(worstDay.return * 100).toFixed(2),
    },
    totalDataDays: sorted.length,
  };
};
