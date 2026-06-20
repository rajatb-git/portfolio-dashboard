import type { HoldingAggregate } from '@/api/dashboard';
import LocalStorageUtil from './localStorage';

export const NOTIFICATIONS_ENABLED_KEY = 'price_alert_notifications';
const NOTIFIED_KEY = 'price_alert_notified';

const isEnabled = (): boolean => LocalStorageUtil.getItem<boolean>(NOTIFICATIONS_ENABLED_KEY) === true;

export const notificationsSupported = (): boolean => typeof window !== 'undefined' && 'Notification' in window;

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
};

// Fire a desktop notification the first time a holding reaches its target on a
// given day. Dedupe per symbol+date so refreshes don't re-spam, and reset the
// ledger each day. Entirely client-side — no data leaves the browser.
export const notifyPriceAlerts = (holdings: HoldingAggregate[], threshold: number): void => {
  if (!isEnabled() || !notificationsSupported() || Notification.permission !== 'granted') return;

  const today = new Date().toISOString().slice(0, 10);
  const ledger = LocalStorageUtil.getItem<{ date: string; symbols: string[] }>(NOTIFIED_KEY);
  const notified = ledger && ledger.date === today ? new Set(ledger.symbols) : new Set<string>();

  const atTarget = holdings.filter((h) => h.targetPrice > 0 && h.currentPrice >= h.targetPrice);

  for (const h of atTarget) {
    if (notified.has(h.symbol)) continue;
    notified.add(h.symbol);
    try {
      new Notification(`🎯 ${h.symbol} hit your target`, {
        body: `${h.symbol} is at ${h.currentPrice} (target ${h.targetPrice}).`,
        tag: `price-alert-${h.symbol}`,
      });
    } catch {
      // Notification construction can throw on some platforms; ignore.
    }
  }

  // Surface near-target crossings too, deduped under the same ledger.
  const nearTarget = holdings.filter(
    (h) =>
      h.targetPrice > 0 && h.currentPrice < h.targetPrice && h.currentPrice >= h.targetPrice * (1 - threshold / 100)
  );
  for (const h of nearTarget) {
    const key = `near:${h.symbol}`;
    if (notified.has(key)) continue;
    notified.add(key);
    try {
      new Notification(`📈 ${h.symbol} nearing target`, {
        body: `${h.symbol} is at ${h.currentPrice}, within ${threshold}% of target ${h.targetPrice}.`,
        tag: `price-alert-${h.symbol}`,
      });
    } catch {
      // ignore
    }
  }

  LocalStorageUtil.setItem(NOTIFIED_KEY, { date: today, symbols: [...notified] });
};
