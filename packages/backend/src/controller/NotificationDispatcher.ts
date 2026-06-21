import type { IAlert } from '../models/AlertModel';
import { getNotificationConfig } from '../models/NotificationConfigModel';
import { logger } from '../utils/winston';
import { mqttPublisher } from './MqttPublisher';

const LABEL = 'NotificationDispatcher';

export type AlertNotificationPayload = {
  symbol: string;
  type: 'stock' | 'crypto';
  direction: 'above' | 'below';
  targetPrice: number;
  price: number;
  triggeredAt: string;
  title: string;
  message: string;
};

// Only public market data — never holdings, quantities, P&L, or portfolio value.
export function buildAlertPayload(alert: IAlert, price: number): AlertNotificationPayload {
  return {
    symbol: alert.symbol,
    type: alert.type,
    direction: alert.direction,
    targetPrice: alert.targetPrice,
    price,
    triggeredAt: alert.triggeredAt || new Date().toISOString(),
    title: `${alert.symbol} alert triggered`,
    message: `${alert.symbol} is at ${price} (target ${alert.direction} ${alert.targetPrice}).`,
  };
}

export async function configureFromSaved(): Promise<void> {
  try {
    const config = await getNotificationConfig();
    mqttPublisher.configure(config.mqtt);
  } catch (err: any) {
    logger.log({ level: 'error', label: LABEL, message: `Failed to configure: ${err.message}` });
  }
}

// Fire-and-forget delivery from the alert monitor's trigger edge.
export async function dispatchAlertTriggered(alert: IAlert, price: number): Promise<void> {
  if (!mqttPublisher.isEnabled()) return;
  try {
    const ok = await mqttPublisher.publish(JSON.stringify(buildAlertPayload(alert, price)));
    if (ok) logger.log({ level: 'info', label: LABEL, message: `Dispatched MQTT alert for ${alert.symbol}` });
  } catch (err: any) {
    logger.log({ level: 'error', label: LABEL, message: `Dispatch failed for ${alert.symbol}: ${err.message}` });
  }
}

export type TestResult = { mqtt: { enabled: boolean; ok: boolean; error?: string } };

export async function sendTestNotification(): Promise<TestResult> {
  if (!mqttPublisher.isEnabled()) {
    return { mqtt: { enabled: false, ok: false, error: 'MQTT is not enabled' } };
  }
  const sample: AlertNotificationPayload = {
    symbol: 'TEST',
    type: 'stock',
    direction: 'above',
    targetPrice: 100,
    price: 123.45,
    triggeredAt: new Date().toISOString(),
    title: 'Portfolio Dashboard test',
    message: 'This is a test notification from Portfolio Dashboard.',
  };
  const ok = await mqttPublisher.publish(JSON.stringify(sample));
  return {
    mqtt: { enabled: true, ok, error: ok ? undefined : 'Publish failed or timed out — check broker URL/credentials' },
  };
}
