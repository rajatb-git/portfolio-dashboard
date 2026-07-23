import { getRebalanceTargetConfig } from '../models/RebalanceTargetConfigModel';
import { createDashboard } from './DashboardController';

export type RebalanceRow = {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto';
  currentPrice: number;
  currentValue: number;
  currentPercent: number;
  targetPercent: number;
  targetValue: number;
  driftPercent: number; // current - target
  action: 'buy' | 'sell' | 'hold';
  tradeValue: number; // dollar amount to trade to reach target
  shares: number; // approximate share count for the trade
};

export type RebalancePlan = {
  rows: RebalanceRow[];
  totalValue: number;
  totalTargetPercent: number;
  totalDrift: number; // sum of absolute drift, a single "how far off" number
  hasTargets: boolean;
};

const HOLD_THRESHOLD = 0.5; // ignore drift under half a percent as noise

export const getRebalancePlan = async (): Promise<RebalancePlan> => {
  const [holdings, config] = await Promise.all([createDashboard(), getRebalanceTargetConfig()]);

  // Aggregate market value and price per symbol across accounts.
  const bySymbol = new Map<string, { name: string; type: 'stock' | 'crypto'; value: number; price: number }>();
  for (const h of holdings) {
    const existing = bySymbol.get(h.symbol);
    if (existing) existing.value += h.marketValue;
    else bySymbol.set(h.symbol, { name: h.name, type: h.type, value: h.marketValue, price: h.currentPrice });
  }

  const totalValue = [...bySymbol.values()].reduce((s, v) => s + v.value, 0);
  const targetMap = new Map(config.targets.map((t) => [t.symbol, t.targetPercent]));

  const rows: RebalanceRow[] = [...bySymbol.entries()].map(([symbol, info]) => {
    const currentPercent = totalValue > 0 ? (info.value / totalValue) * 100 : 0;
    // Unset symbols default to their current weight, so an untouched portfolio
    // shows zero drift until the user actually sets a target.
    const targetPercent = targetMap.has(symbol) ? targetMap.get(symbol)! : currentPercent;
    const targetValue = (targetPercent / 100) * totalValue;
    const deltaValue = targetValue - info.value;
    const driftPercent = currentPercent - targetPercent;

    let action: 'buy' | 'sell' | 'hold' = 'hold';
    if (Math.abs(driftPercent) >= HOLD_THRESHOLD) action = deltaValue > 0 ? 'buy' : 'sell';

    return {
      symbol,
      name: info.name,
      type: info.type,
      currentPrice: info.price,
      currentValue: +info.value.toFixed(2),
      currentPercent: +currentPercent.toFixed(2),
      targetPercent: +targetPercent.toFixed(2),
      targetValue: +targetValue.toFixed(2),
      driftPercent: +driftPercent.toFixed(2),
      action,
      tradeValue: +Math.abs(deltaValue).toFixed(2),
      shares: info.price > 0 ? +(Math.abs(deltaValue) / info.price).toFixed(4) : 0,
    };
  });

  rows.sort((a, b) => Math.abs(b.driftPercent) - Math.abs(a.driftPercent));

  const totalTargetPercent = +[...targetMap.values()].reduce((s, v) => s + v, 0).toFixed(2);
  const totalDrift = +rows.reduce((s, r) => s + Math.abs(r.driftPercent), 0).toFixed(2);

  return {
    rows,
    totalValue: +totalValue.toFixed(2),
    totalTargetPercent,
    totalDrift,
    hasTargets: config.targets.length > 0,
  };
};
