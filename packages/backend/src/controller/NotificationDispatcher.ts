import moment from 'moment';
import type { IAlert } from '../models/AlertModel';
import type { IIPO } from '../models/IPOModel';
import { type NotificationKind, recordNotification } from '../models/NotificationHistoryModel';
import { getNotificationConfig } from '../models/NotificationConfigModel';
import { getQuietHoursConfig } from '../models/QuietHoursConfigModel';
import { logger } from '../utils/winston';
import { mqttPublisher } from './MqttPublisher';
import { quietHoursService } from './QuietHoursService';

const LABEL = 'NotificationDispatcher';

const signedPct = (n: number): string => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

const compactUsd = (n: number): string => {
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n}`;
};

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
// A cost-basis alert names the condition without quoting the basis itself, so the
// payload still carries nothing about the size or cost of the position.
export function buildAlertPayload(
  alert: IAlert,
  price: number,
  description?: string
): AlertNotificationPayload {
  const condition = description ?? `target ${alert.direction} ${alert.targetPrice}`;
  return {
    symbol: alert.symbol,
    type: alert.type,
    direction: alert.direction,
    targetPrice: alert.targetPrice,
    price,
    triggeredAt: alert.triggeredAt || new Date().toISOString(),
    title: `${alert.symbol} alert triggered`,
    message: `${alert.symbol} is at ${price} (${condition}).`,
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

export type EarningsPayload = {
  symbol: string;
  name: string;
  date: string;
  hour: string | null;
  epsEstimate: number | null;
  title: string;
  message: string;
};

export type EarningsResultPayload = {
  symbol: string;
  name: string;
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  surprisePercent: number | null;
  title: string;
  message: string;
};

export type DividendPayload = {
  symbol: string;
  name: string;
  event: 'ex_dividend' | 'payment';
  date: string;
  amountPerShare: number;
  expectedAmount: number;
  title: string;
  message: string;
};

// Earnings dates and EPS estimates are public company data; the expected payment
// on a dividend is derived from the user's own share count, so like the move and
// summary payloads it goes only to the user's self-hosted broker — never to an
// external AI provider.
export function buildEarningsPayload(
  symbol: string,
  name: string,
  date: string,
  hour: string | null,
  epsEstimate: number | null,
  daysAway: number
): EarningsPayload {
  const when = daysAway === 0 ? 'today' : daysAway === 1 ? 'tomorrow' : `in ${daysAway} days`;
  const slot = hour === 'bmo' ? 'before the open' : hour === 'amc' ? 'after the close' : '';
  const estimate = epsEstimate !== null ? ` Consensus EPS ${epsEstimate}.` : '';
  return {
    symbol,
    name,
    date,
    hour,
    epsEstimate,
    title: `${symbol} reports ${when}`,
    message: `${name} (${symbol}) reports earnings ${when}${slot ? ` ${slot}` : ''} on ${date}.${estimate}`,
  };
}

export function buildEarningsResultPayload(
  symbol: string,
  name: string,
  date: string,
  epsActual: number | null,
  epsEstimate: number | null,
  surprisePercent: number | null,
  revenueActual: number | null = null,
  revenueEstimate: number | null = null
): EarningsResultPayload {
  const verdict =
    epsActual !== null && epsEstimate !== null ? (epsActual >= epsEstimate ? 'beat' : 'missed') : 'reported';
  const eps =
    epsActual !== null && epsEstimate !== null
      ? ` EPS ${epsActual} vs ${epsEstimate} estimate${
          surprisePercent !== null ? ` (${surprisePercent >= 0 ? '+' : ''}${surprisePercent.toFixed(1)}%)` : ''
        }.`
      : epsActual !== null
        ? ` EPS ${epsActual}.`
        : '';
  const revenue =
    revenueActual !== null
      ? ` Revenue ${compactUsd(revenueActual)}${
          revenueEstimate !== null ? ` vs ${compactUsd(revenueEstimate)} expected` : ''
        }.`
      : '';
  // The numbers belong in the title too: a phone notification shows that line
  // and nothing else until it is opened.
  const headline =
    epsActual !== null && epsEstimate !== null
      ? `${symbol} ${verdict} — EPS ${epsActual} vs ${epsEstimate}`
      : `${symbol} ${verdict} on earnings`;

  return {
    symbol,
    name,
    date,
    epsActual,
    epsEstimate,
    revenueActual,
    revenueEstimate,
    surprisePercent,
    title: headline,
    message: `${name} (${symbol}) ${verdict} for the quarter reported ${date}.${eps}${revenue}`,
  };
}

export function buildDividendPayload(
  symbol: string,
  name: string,
  event: 'ex_dividend' | 'payment',
  date: string,
  amountPerShare: number,
  expectedAmount: number
): DividendPayload {
  const money = `$${expectedAmount.toFixed(2)}`;
  return {
    symbol,
    name,
    event,
    date,
    amountPerShare,
    expectedAmount,
    title: event === 'ex_dividend' ? `${symbol} goes ex-dividend ${date}` : `${symbol} pays ${money} on ${date}`,
    message:
      event === 'ex_dividend'
        ? `${name} (${symbol}) goes ex-dividend on ${date} at $${amountPerShare} per share — you would receive about ${money}.`
        : `${name} (${symbol}) pays $${amountPerShare} per share on ${date} — about ${money} to you.`,
  };
}

export async function configureFromSaved(): Promise<void> {
  try {
    const config = await getNotificationConfig();
    mqttPublisher.configure(config.mqtt);
    const quiet = await getQuietHoursConfig();
    quietHoursService.configure(quiet, config.mqtt.topic);
    quietHoursService.start();
  } catch (err: any) {
    logger.log({ level: 'error', label: LABEL, message: `Failed to configure: ${err.message}` });
  }
}

type DeliverInput = {
  kind: NotificationKind;
  symbol?: string;
  title: string;
  message: string;
  payload: object;
  topic?: string;
  // Magnitude of the move behind this notification, when there is one. Quiet
  // hours measures its critical override against it.
  severityPercent?: number;
};

// The single point every notification passes through: quiet-hours gating, the
// publish itself, and the history record. Never throws — delivery problems are
// logged and reported through the boolean.
async function deliver(input: DeliverInput): Promise<boolean> {
  const { kind, symbol = '', title, message, payload, topic, severityPercent } = input;
  if (!mqttPublisher.isEnabled()) return false;

  const resolvedTopic = topic ?? '';
  const gate = quietHoursService.gate(kind, severityPercent);

  if (gate !== 'send') {
    if (gate === 'hold') {
      await quietHoursService.hold({ kind, symbol, title, message, topic: resolvedTopic });
    }
    logger.log({
      level: 'info',
      label: LABEL,
      message: `Quiet hours ${gate === 'hold' ? 'held' : 'dropped'} ${kind} notification${symbol ? ` for ${symbol}` : ''}`,
    });
    await safeRecord({ kind, symbol, title, message, topic: resolvedTopic, delivered: false, suppressed: true });
    return false;
  }

  let ok = false;
  try {
    ok = await mqttPublisher.publish(JSON.stringify(payload), topic);
    logger.log({
      level: ok ? 'info' : 'warn',
      label: LABEL,
      message: `${ok ? 'Dispatched' : 'Failed to dispatch'} ${kind} notification${symbol ? ` for ${symbol}` : ''}`,
    });
  } catch (err: any) {
    logger.log({ level: 'error', label: LABEL, message: `${kind} dispatch failed: ${err.message}` });
  }

  await safeRecord({ kind, symbol, title, message, topic: resolvedTopic, delivered: ok, suppressed: false });
  return ok;
}

// History is a convenience, never a reason to fail a delivery.
async function safeRecord(entry: Parameters<typeof recordNotification>[0]): Promise<void> {
  try {
    await recordNotification(entry);
  } catch (err: any) {
    logger.log({ level: 'error', label: LABEL, message: `Failed to record notification: ${err.message}` });
  }
}

export async function dispatchAlertTriggered(alert: IAlert, price: number, description?: string): Promise<boolean> {
  const payload = buildAlertPayload(alert, price, description);
  return deliver({
    kind: 'alert',
    symbol: payload.symbol,
    title: payload.title,
    message: payload.message,
    payload,
  });
}

export async function dispatchMoveAlert(payload: MoveAlertPayload): Promise<boolean> {
  return deliver({
    kind: payload.kind === 'spike' ? 'spike' : 'move',
    symbol: payload.symbol ?? '',
    title: payload.title,
    message: payload.message,
    payload,
    severityPercent: payload.kind === 'spike' ? payload.windowChange : payload.percentChange,
  });
}

export async function dispatchNewsAlert(payload: NewsAlertPayload, topic?: string): Promise<boolean> {
  return deliver({
    kind: 'news',
    symbol: payload.symbol ?? '',
    title: payload.title,
    message: payload.message,
    payload,
    topic,
  });
}

export async function dispatchIpoReminder(payload: IpoReminderPayload): Promise<boolean> {
  return deliver({
    kind: 'ipo_reminder',
    symbol: payload.symbol,
    title: payload.title,
    message: payload.message,
    payload,
  });
}

export async function dispatchIpoAnnouncement(payload: IpoAnnouncementPayload, topic?: string): Promise<boolean> {
  return deliver({
    kind: 'ipo_announcement',
    symbol: payload.symbol,
    title: payload.title,
    message: payload.message,
    payload,
    topic,
  });
}

export async function dispatchEarnings(payload: EarningsPayload, topic?: string): Promise<boolean> {
  return deliver({
    kind: 'earnings',
    symbol: payload.symbol,
    title: payload.title,
    message: payload.message,
    payload,
    topic,
  });
}

export async function dispatchEarningsResult(payload: EarningsResultPayload, topic?: string): Promise<boolean> {
  return deliver({
    kind: 'earnings_result',
    symbol: payload.symbol,
    title: payload.title,
    message: payload.message,
    payload,
    topic,
    severityPercent: payload.surprisePercent ?? undefined,
  });
}

export async function dispatchDividend(payload: DividendPayload, topic?: string): Promise<boolean> {
  return deliver({
    kind: 'dividend',
    symbol: payload.symbol,
    title: payload.title,
    message: payload.message,
    payload,
    topic,
  });
}

// Scheduled summaries fire at times the user chose, so they bypass quiet hours;
// routing them through deliver() still puts them in the history.
export async function dispatchSummary(
  title: string,
  message: string,
  payload: object,
  topic: string
): Promise<boolean> {
  return deliver({ kind: 'summary', title, message, payload, topic });
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
  const ok = await deliver({
    kind: 'test',
    symbol: sample.symbol,
    title: sample.title,
    message: sample.message,
    payload: sample,
  });
  return {
    mqtt: { enabled: true, ok, error: ok ? undefined : 'Publish failed or timed out — check broker URL/credentials' },
  };
}
