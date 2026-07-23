import axios from './axios';

import { DB_HOST } from '@/config';
import { catchCustomError } from './apiUtil';

export type RebalanceRow = {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto';
  currentPrice: number;
  currentValue: number;
  currentPercent: number;
  targetPercent: number;
  targetValue: number;
  driftPercent: number;
  action: 'buy' | 'sell' | 'hold';
  tradeValue: number;
  shares: number;
};

export type RebalancePlan = {
  rows: RebalanceRow[];
  totalValue: number;
  totalTargetPercent: number;
  totalDrift: number;
  hasTargets: boolean;
};

export type RebalanceTarget = {
  symbol: string;
  targetPercent: number;
};

export default class RebalanceAPI {
  getPlan = async (): Promise<RebalancePlan> =>
    axios
      .get(DB_HOST + '/rebalance/plan')
      .then((response) => response.data)
      .catch(catchCustomError);

  getTargets = async (): Promise<{ targets: RebalanceTarget[] }> =>
    axios
      .get(DB_HOST + '/rebalance/targets')
      .then((response) => response.data)
      .catch(catchCustomError);

  saveTargets = async (targets: RebalanceTarget[]): Promise<{ targets: RebalanceTarget[] }> =>
    axios
      .post(DB_HOST + '/rebalance/targets', { targets })
      .then((response) => response.data)
      .catch(catchCustomError);
}
