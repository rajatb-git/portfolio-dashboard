import moment from 'moment';
import { getStockMetrics } from '../externalApis/finnHub';
import type { AlertCondition, IAlert } from '../models/AlertModel';
import { CacheDBModel } from '../models/CacheModel';
import { HoldingsModel } from '../models/HoldingsModel';
import { logger } from '../utils/winston';

const LABEL = 'AlertConditions';

// A 52-week high moves at most once a day, so this only needs refreshing daily.
const HIGH_CACHE_HOURS = 24;

// Reference data the non-price conditions are measured against.
export type AlertContext = {
  fiftyTwoWeekHigh: Map<string, number>;
  costBasis: Map<string, number>;
};

export const EMPTY_ALERT_CONTEXT: AlertContext = { fiftyTwoWeekHigh: new Map(), costBasis: new Map() };

// Stored alerts predating the condition field are plain price targets.
export const conditionOf = (alert: Pick<IAlert, 'condition'>): AlertCondition => alert.condition ?? 'price';

const highCacheKey = (symbol: string): string => `alert_52w_high_${symbol.toUpperCase()}`;

async function fetch52WeekHigh(symbol: string): Promise<number | null> {
  const cacheModel = await CacheDBModel().initialize();
  const key = highCacheKey(symbol);
  const cached = cacheModel.findById(key);

  if (cached && moment().diff(moment(cached.updatedAt), 'hours') < HIGH_CACHE_HOURS) {
    const value = Number(cached.value);
    if (Number.isFinite(value) && value > 0) return value;
  }

  try {
    const response = await getStockMetrics(symbol);
    const high = Number(response?.metric?.['52WeekHigh']);
    if (!Number.isFinite(high) || high <= 0) return null;
    await cacheModel.insertOrUpdate({ key, value: String(high) }, key);
    return high;
  } catch (err: any) {
    logger.log({ level: 'error', label: LABEL, message: `52-week high failed for ${symbol}: ${err.message}` });
    // Serve a stale value rather than silently disarming the alert.
    if (cached) {
      const value = Number(cached.value);
      if (Number.isFinite(value) && value > 0) return value;
    }
    return null;
  }
}

// Weighted average cost per symbol across every account holding it.
async function loadCostBasis(symbols: Set<string>): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (symbols.size === 0) return out;

  const holdingsModel = await HoldingsModel().initialize();
  const totals = new Map<string, { qty: number; cost: number }>();

  for (const holding of holdingsModel.getAllRecords()) {
    const symbol = holding.symbol?.toUpperCase();
    if (!symbol || !symbols.has(symbol) || holding.qty <= 0) continue;
    const entry = totals.get(symbol) ?? { qty: 0, cost: 0 };
    entry.qty += holding.qty;
    entry.cost += holding.qty * holding.averagePrice;
    totals.set(symbol, entry);
  }

  for (const [symbol, { qty, cost }] of totals) {
    if (qty > 0) out.set(symbol, +(cost / qty).toFixed(4));
  }
  return out;
}

// Loads only what the given alerts actually need, so a portfolio of plain price
// alerts costs no extra network calls.
export async function buildAlertContext(alerts: IAlert[]): Promise<AlertContext> {
  const needHigh = new Set<string>();
  const needCost = new Set<string>();

  for (const alert of alerts) {
    const symbol = alert.symbol.toUpperCase();
    if (conditionOf(alert) === 'pct_from_high') needHigh.add(symbol);
    if (conditionOf(alert) === 'cost_basis') needCost.add(symbol);
  }

  const fiftyTwoWeekHigh = new Map<string, number>();
  const highs = await Promise.all(
    [...needHigh].map(async (symbol) => [symbol, await fetch52WeekHigh(symbol)] as const)
  );
  for (const [symbol, high] of highs) if (high !== null) fiftyTwoWeekHigh.set(symbol, high);

  return { fiftyTwoWeekHigh, costBasis: await loadCostBasis(needCost) };
}

// The price level this alert fires at, or null when the reference data needed to
// resolve it isn't available (no 52-week high, no position to take a cost from,
// no peak recorded yet).
export function resolveTarget(alert: IAlert, context: AlertContext): number | null {
  const symbol = alert.symbol.toUpperCase();

  switch (conditionOf(alert)) {
    case 'trailing_stop': {
      const trail = alert.trailPercent ?? 0;
      if (trail <= 0 || !alert.peakPrice) return null;
      return +(alert.peakPrice * (1 - trail / 100)).toFixed(4);
    }
    case 'pct_from_high': {
      const threshold = alert.thresholdPercent ?? 0;
      const high = context.fiftyTwoWeekHigh.get(symbol);
      if (threshold <= 0 || !high) return null;
      return +(high * (1 - threshold / 100)).toFixed(4);
    }
    case 'cost_basis':
      return context.costBasis.get(symbol) ?? null;
    default:
      return alert.targetPrice > 0 ? alert.targetPrice : null;
  }
}

// Trailing stops and drawdowns only ever fire downward; the other two follow the
// alert's own direction.
export function isTriggered(alert: IAlert, price: number, context: AlertContext): boolean {
  const target = resolveTarget(alert, context);
  if (target === null) return false;

  const condition = conditionOf(alert);
  if (condition === 'trailing_stop' || condition === 'pct_from_high') return price <= target;
  return alert.direction === 'above' ? price >= target : price <= target;
}

// A trailing stop needs the running peak kept up to date. Returns the new peak
// when it moved, so callers only persist on a change.
export function nextPeak(alert: IAlert, price: number): number | null {
  if (conditionOf(alert) !== 'trailing_stop') return null;
  if (alert.peakPrice && price <= alert.peakPrice) return null;
  return price;
}

// Human-readable description of what the alert watches, for the UI and messages.
export function describeCondition(alert: IAlert, context: AlertContext = EMPTY_ALERT_CONTEXT): string {
  const target = resolveTarget(alert, context);
  const level = target !== null ? ` ($${target})` : '';
  switch (conditionOf(alert)) {
    case 'trailing_stop':
      return `${alert.trailPercent ?? 0}% below its peak${level}`;
    case 'pct_from_high':
      return `${alert.thresholdPercent ?? 0}% below its 52-week high${level}`;
    case 'cost_basis':
      return `${alert.direction === 'above' ? 'at or above' : 'at or below'} cost basis${level}`;
    default:
      return `${alert.direction === 'above' ? 'at or above' : 'at or below'} $${alert.targetPrice}`;
  }
}
