import type { IAlertStatus } from '@/models/AlertModel';
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

// Fire a desktop notification the first time each alert triggers on a given day.
// Dedupe per alert id so refreshes don't re-spam, and reset the ledger daily.
// Entirely client-side — no data leaves the browser.
export const notifyTriggeredAlerts = (statuses: IAlertStatus[]): void => {
  if (!isEnabled() || !notificationsSupported() || Notification.permission !== 'granted') return;

  const today = new Date().toISOString().slice(0, 10);
  const ledger = LocalStorageUtil.getItem<{ date: string; ids: string[] }>(NOTIFIED_KEY);
  const notified = ledger && ledger.date === today ? new Set(ledger.ids) : new Set<string>();

  for (const a of statuses) {
    if (!a.triggered || a.currentPrice == null) continue;
    if (notified.has(a.id)) continue;
    notified.add(a.id);
    const arrow = a.direction === 'above' ? '📈' : '📉';
    try {
      new Notification(`${arrow} ${a.symbol} alert triggered`, {
        body: `${a.symbol} is at ${a.currentPrice} (target ${a.direction} ${a.targetPrice}).`,
        tag: `price-alert-${a.id}`,
      });
    } catch {
      // Notification construction can throw on some platforms; ignore.
    }
  }

  LocalStorageUtil.setItem(NOTIFIED_KEY, { date: today, ids: [...notified] });
};
