import moment from 'moment';
import type { IAlert } from '../models/AlertModel';
import type { IIPO } from '../models/IPOModel';
import { getNotificationConfig } from '../models/NotificationConfigModel';
import { logger } from '../utils/winston';
import { mqttPublisher } from './MqttPublisher';

const LABEL = 'NotificationDispatcher';

const signedPct = (n: number): string => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

export type MoveAlertPayload = {
  // 'threshold' — the day change crossed a configured level.
  // 'spike' — the price moved sharply inside a short rolling window.
  kind: 'threshold' | 'spike';
  scope: 'holding' | 'portfolio';
  symbol?: string;
  percentChange: number;
  thresholdPercent: number;
  windowMinutes?: number;
  windowChange?: number;
  title: string;
  message: string;
};

export type NewsAlertPayload = {
  // The holding the story is about, or null for a broad-market headline.
  symbol: string | null;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  breaking: boolean;
  matchedKeywords: string[];
  title: string;
  message: string;
};

export type IpoReminderPayload = {
  symbol: string;
  name: string;
  date: string;
  title: string;
  message: string;
};

export type IpoAnnouncementPayload = {
  symbol: string;
  name: string;
  date: string;
  exchange: string;
  numberOfShares: number;
  price: string;
  totalSharesValue: number;
  status: string;
  title: string;
  message: string;
};

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

// Portfolio-scope payloads carry the user's own day P&L% — sent only to the
// user's self-hosted MQTT broker (their notification channel), never to any
// external AI provider, so the AI data-privacy rule is not in play here.
export function buildMoveAlertPayload(
  scope: 'holding' | 'portfolio',
  percentChange: number,
  thresholdPercent: number,
  symbol?: string
): MoveAlertPayload {
  const pct = signedPct(percentChange);
  const subject = scope === 'portfolio' ? 'Portfolio' : (symbol as string);
  return {
    kind: 'threshold',
    scope,
    ...(symbol ? { symbol } : {}),
    percentChange,
    thresholdPercent,
    title: `${subject} moved ${pct} today`,
    message: `${subject} is ${pct} today — past your ${thresholdPercent}% move alert threshold.`,
  };
}

// Velocity alert: how far the price ran inside a short window, which a day-change
// threshold alone misses (a symbol can round-trip 4% and end the day flat).
export function buildSpikeAlertPayload(
  symbol: string,
  windowChange: number,
  windowMinutes: number,
  dayPercentChange: number,
  spikePercent: number
): MoveAlertPayload {
  const direction = windowChange >= 0 ? 'jumped' : 'dropped';
  return {
    kind: 'spike',
    scope: 'holding',
    symbol,
    percentChange: dayPercentChange,
    thresholdPercent: spikePercent,
    windowMinutes,
    windowChange,
    title: `${symbol} ${direction} ${signedPct(windowChange)} in ${windowMinutes}m`,
    message: `${symbol} ${direction} ${signedPct(windowChange)} over the last ${windowMinutes} minutes (${signedPct(dayPercentChange)} on the day).`,
  };
}

// Public news only — headline, summary, source, link. No holdings, quantities,
// cost basis, or P&L travel with a news alert.
export function buildNewsAlertPayload(article: {
  symbol: string | null;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  breaking: boolean;
  matchedKeywords: string[];
}): NewsAlertPayload {
  const subject = article.symbol ? `${article.symbol}` : 'Markets';
  const prefix = article.breaking ? 'Breaking' : 'News';
  return {
    ...article,
    title: `${prefix} · ${subject}`,
    message: article.headline,
  };
}

// Pure public IPO calendar data — no personal position data involved.
export function buildIpoReminderPayload(symbol: string, name: string, date: string): IpoReminderPayload {
  const dateLabel = moment(date).format('MMMM D, YYYY');
  return {
    symbol,
    name,
    date,
    title: `${symbol} IPO reminder`,
    message: `${name} (${symbol}) is expected to IPO on ${dateLabel}.`,
  };
}

// Pure public IPO calendar data — no personal position data involved.
export function buildIpoAnnouncementPayload(ipo: IIPO): IpoAnnouncementPayload {
  const dateLabel = moment(ipo.date).format('MMMM D, YYYY');
  const priceLabel = ipo.price ? `at ${ipo.price}` : 'at an undisclosed price';
  return {
    symbol: ipo.symbol,
    name: ipo.name,
    date: ipo.date,
    exchange: ipo.exchange,
    numberOfShares: ipo.numberOfShares,
    price: ipo.price,
    totalSharesValue: ipo.totalSharesValue,
    status: ipo.status,
    title: `New IPO announced: ${ipo.name} (${ipo.symbol})`,
    message: `${ipo.name} (${ipo.symbol}) is expected to list on ${ipo.exchange || 'an exchange'} on ${dateLabel} ${priceLabel}.`,
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
    if (ok) {
      logger.log({ level: 'info', label: LABEL, message: `Dispatched MQTT alert for ${alert.symbol}` });
    } else {
      logger.log({ level: 'warn', label: LABEL, message: `MQTT alert for ${alert.symbol} was not delivered` });
    }
  } catch (err: any) {
    logger.log({ level: 'error', label: LABEL, message: `Dispatch failed for ${alert.symbol}: ${err.message}` });
  }
}

// Fire-and-forget delivery from the move-alert monitor's threshold crossing.
export async function dispatchMoveAlert(payload: MoveAlertPayload): Promise<void> {
  if (!mqttPublisher.isEnabled()) return;
  try {
    const ok = await mqttPublisher.publish(JSON.stringify(payload));
    if (ok) {
      logger.log({
        level: 'info',
        label: LABEL,
        message: `Dispatched MQTT move alert for ${payload.symbol ?? 'portfolio'}`,
      });
    } else {
      logger.log({
        level: 'warn',
        label: LABEL,
        message: `MQTT move alert for ${payload.symbol ?? 'portfolio'} was not delivered`,
      });
    }
  } catch (err: any) {
    logger.log({ level: 'error', label: LABEL, message: `Move alert dispatch failed: ${err.message}` });
  }
}

// Fire-and-forget delivery from the news watcher. Returns whether it landed so
// the watcher only records an article as delivered once it actually went out.
export async function dispatchNewsAlert(payload: NewsAlertPayload, topic?: string): Promise<boolean> {
  if (!mqttPublisher.isEnabled()) return false;
  try {
    const ok = await mqttPublisher.publish(JSON.stringify(payload), topic);
    if (ok) {
      logger.log({
        level: 'info',
        label: LABEL,
        message: `Dispatched MQTT news alert for ${payload.symbol ?? 'market'}: ${payload.headline}`,
      });
    } else {
      logger.log({ level: 'warn', label: LABEL, message: `News alert for ${payload.symbol ?? 'market'} not delivered` });
    }
    return ok;
  } catch (err: any) {
    logger.log({ level: 'error', label: LABEL, message: `News alert dispatch failed: ${err.message}` });
    return false;
  }
}

// Fire-and-forget delivery from the IPO reminder service.
export async function dispatchIpoReminder(payload: IpoReminderPayload): Promise<void> {
  if (!mqttPublisher.isEnabled()) return;
  try {
    const ok = await mqttPublisher.publish(JSON.stringify(payload));
    if (ok) {
      logger.log({ level: 'info', label: LABEL, message: `Dispatched MQTT IPO reminder for ${payload.symbol}` });
    } else {
      logger.log({ level: 'warn', label: LABEL, message: `MQTT IPO reminder for ${payload.symbol} was not delivered` });
    }
  } catch (err: any) {
    logger.log({
      level: 'error',
      label: LABEL,
      message: `IPO reminder dispatch failed for ${payload.symbol}: ${err.message}`,
    });
  }
}

// Fire-and-forget delivery from the IPO announcement service.
export async function dispatchIpoAnnouncement(payload: IpoAnnouncementPayload, topic?: string): Promise<boolean> {
  if (!mqttPublisher.isEnabled()) return false;
  try {
    const ok = await mqttPublisher.publish(JSON.stringify(payload), topic);
    if (ok) {
      logger.log({ level: 'info', label: LABEL, message: `Dispatched MQTT IPO announcement for ${payload.symbol}` });
    }
    return ok;
  } catch (err: any) {
    logger.log({
      level: 'error',
      label: LABEL,
      message: `IPO announcement dispatch failed for ${payload.symbol}: ${err.message}`,
    });
    return false;
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
