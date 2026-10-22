import moment from 'moment';
import { getTaxConfig, ITaxConfig } from '../models/TaxConfigModel';
import { roundQty } from '../utils';
import { calculateRealizedGains } from './RealizedGainsController';
import { enrichLots, estimateTax, loadPositionsWithLots, marginalTax } from './TaxLotController';

export type UpcomingLongTerm = {
  symbol: string;
  name: string;
  accountId: string;
  lotId: string;
  acquired: string;
  qty: number;
  longTermDate: string;
  daysAway: number;
  gain: number;
  taxSaving: number;
};

export type TaxExposure = {
  config: ITaxConfig;
  year: number;
  realizedYtd: { shortTerm: number; longTerm: number; total: number; estimatedTax: number };
  unrealized: {
    shortTerm: number;
    longTerm: number;
    total: number;
    // Additional tax if every position were sold today, on top of this year's realized gains.
    estimatedTaxIfSold: number;
  };
  upcomingLongTerm: UpcomingLongTerm[];
  estimatedLots: number;
  unpricedPositions: number;
};

const UPCOMING_WINDOW_DAYS = 90;

const round2 = (n: number) => +n.toFixed(2);

export const getTaxExposure = async (): Promise<TaxExposure> => {
  const [config, realized, { positions }] = await Promise.all([
    getTaxConfig(),
    calculateRealizedGains(),
    loadPositionsWithLots(),
  ]);

  const now = moment();
  const year = now.year();
  const ytd = realized.byYear.find((y) => y.year === year);
  const realizedYtd = { shortTerm: ytd?.shortTermGain ?? 0, longTerm: ytd?.longTermGain ?? 0 };

  let shortTerm = 0;
  let longTerm = 0;
  let estimatedLots = 0;
  let unpricedPositions = 0;
  const upcomingLongTerm: UpcomingLongTerm[] = [];

  for (const { holding, lots, currentPrice } of positions) {
    estimatedLots += lots.filter((l) => l.estimated).length;
    if (currentPrice === null) {
      unpricedPositions += 1;
      continue;
    }
    for (const lot of enrichLots(lots, currentPrice, now)) {
      if (lot.term === 'long') {
        longTerm += lot.gain;
        continue;
      }
      shortTerm += lot.gain;
      if (lot.gain > 0 && lot.daysToLongTerm <= UPCOMING_WINDOW_DAYS) {
        upcomingLongTerm.push({
          symbol: holding.symbol,
          name: holding.name,
          accountId: holding.accountId,
          lotId: lot.id,
          acquired: lot.date,
          qty: roundQty(lot.qty),
          longTermDate: lot.longTermDate,
          daysAway: lot.daysToLongTerm,
          gain: lot.gain,
          taxSaving: round2((lot.gain * (config.shortTermRate - config.longTermRate)) / 100),
        });
      }
    }
  }

  upcomingLongTerm.sort((a, b) => a.daysAway - b.daysAway || b.taxSaving - a.taxSaving);

  return {
    config,
    year,
    realizedYtd: {
      shortTerm: round2(realizedYtd.shortTerm),
      longTerm: round2(realizedYtd.longTerm),
      total: round2(realizedYtd.shortTerm + realizedYtd.longTerm),
      estimatedTax: estimateTax(realizedYtd.shortTerm, realizedYtd.longTerm, config).total,
    },
    unrealized: {
      shortTerm: round2(shortTerm),
      longTerm: round2(longTerm),
      total: round2(shortTerm + longTerm),
      estimatedTaxIfSold: marginalTax(realizedYtd, { shortTerm, longTerm }, config).total,
    },
    upcomingLongTerm,
    estimatedLots,
    unpricedPositions,
  };
};
