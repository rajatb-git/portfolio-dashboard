// What the alert watches. 'price' is a fixed target; the rest derive their level
// from a percentage against a moving reference.
export type AlertCondition = 'price' | 'trailing_stop' | 'pct_from_high' | 'cost_basis';

export interface IAlert {
  id?: string;
  symbol: string;
  type: 'stock' | 'crypto';
  condition: AlertCondition;
  targetPrice: number;
  direction: 'above' | 'below';
  trailPercent?: number;
  thresholdPercent?: number;
  note?: string;
  peakPrice?: number;
  triggeredAt?: string | null;
  lastPrice?: number;
  lastCheckedAt?: string;
}

export interface IAlertStatus extends IAlert {
  id: string;
  currentPrice: number | null;
  percentChange: number | null;
  // The price the alert actually fires at, resolved server-side. Null when the
  // reference data isn't available yet (no peak recorded, no 52-week high).
  resolvedTarget: number | null;
  conditionLabel: string;
  triggered: boolean;
}

export const ALERT_CONDITION_LABELS: Record<AlertCondition, string> = {
  price: 'Price target',
  trailing_stop: 'Trailing stop',
  pct_from_high: '% off 52-week high',
  cost_basis: 'Cost basis cross',
};
