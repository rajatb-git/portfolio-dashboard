import type { StockMetrics } from '../externalApis/finnHub';
import { read } from '../marketData/store';
import type { AlertCondition, IAlert } from '../models/AlertModel';
import { HoldingsModel } from '../models/HoldingsModel';

// Reference data the non-price conditions are measured against.
export type AlertContext = {
  fiftyTwoWeekHigh: Map<string, number>;
  costBasis: Map<string, number>;
};

export const EMPTY_ALERT_CONTEXT: AlertContext = { fiftyTwoWeekHigh: new Map(), costBasis: new Map() };

// Stored alerts predating the condition field are plain price targets.
export const conditionOf = (alert: Pick<IAlert, 'condition'>): AlertCondition => alert.condition ?? 'price';

// From the stored stock metrics, which the scheduler keeps fresh for every
// symbol with a %-from-high alert.
async function fetch52WeekHigh(symbol: string): Promise<number | null> {
  const metrics = await read<StockMetrics>('metrics', symbol.toUpperCase(), { mode: 'fresh' });
  const high = Number(metrics.value?.week52High);
  return Number.isFinite(high) && high > 0 ? high : null;
}

// Weighted average cost per symbol across every account holding it.
export async function loadCostBasis(symbols: Set<string>): Promise<Map<string, number>> {
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

// The level a derived target is measured from, so the page can show what the
// alert is anchored to and not just the computed trigger.
export function referenceLevel(alert: IAlert, context: AlertContext): { label: string; value: number } | null {
  const symbol = alert.symbol.toUpperCase();
  switch (conditionOf(alert)) {
    case 'trailing_stop':
      return alert.peakPrice ? { label: 'Peak', value: alert.peakPrice } : null;
    case 'pct_from_high': {
      const high = context.fiftyTwoWeekHigh.get(symbol);
      return high ? { label: '52-week high', value: high } : null;
    }
    case 'cost_basis': {
      const basis = context.costBasis.get(symbol);
      return basis ? { label: 'Cost basis', value: basis } : null;
    }
    default:
      return null;
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
const usd = (n: number): string =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function describeCondition(alert: IAlert, context: AlertContext = EMPTY_ALERT_CONTEXT): string {
  const target = resolveTarget(alert, context);
  const level = target !== null ? ` (${usd(target)})` : '';
  switch (conditionOf(alert)) {
    case 'trailing_stop':
      return `${alert.trailPercent ?? 0}% below its peak${level}`;
    case 'pct_from_high':
      return `${alert.thresholdPercent ?? 0}% below its 52-week high${level}`;
    case 'cost_basis':
      return `${alert.direction === 'above' ? 'at or above' : 'at or below'} cost basis${level}`;
    default:
      return `${alert.direction === 'above' ? 'at or above' : 'at or below'} ${usd(alert.targetPrice)}`;
  }
}
