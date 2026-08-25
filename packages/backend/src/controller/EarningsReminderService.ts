import moment from 'moment';
import { getEarningsHistory } from '../externalApis/finnHub';
import {
  DEFAULT_EARNINGS_REMINDER_CONFIG,
  type IEarningsReminderConfig,
} from '../models/EarningsReminderConfigModel';
import { getJobState, setJobState } from '../models/JobRunStateModel';
import { PersistentInterval } from '../utils/PersistentInterval';
import { logger } from '../utils/winston';
import { getHoldingsEarningsCalendar } from './HoldingsEarningsController';
import {
  buildEarningsPayload,
  buildEarningsResultPayload,
  dispatchEarnings,
  dispatchEarningsResult,
} from './NotificationDispatcher';

const LABEL = 'EarningsReminderService';

// Earnings dates move at day granularity and the calendar itself is cached for
// hours, so an hourly poll is as often as this can usefully run.
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

const REMINDED_PREFIX = 'earnings_reminded_';
const RESULTED_PREFIX = 'earnings_resulted_';
// Reports we have announced and are still waiting on numbers for. The upcoming
// calendar drops an entry the moment its date passes, so the pending list is the
// only way to know what to look up afterwards.
const PENDING_KEY = 'earnings_pending';

// How long to keep chasing results before giving up on a report.
const RESULT_GRACE_DAYS = 5;

type Pending = { symbol: string; name: string; date: string };

class EarningsReminderService {
  private readonly scheduler = new PersistentInterval('earnings_reminder');
  private config: IEarningsReminderConfig = DEFAULT_EARNINGS_REMINDER_CONFIG;
  private running = false;

  private async alreadyFired(key: string): Promise<boolean> {
    try {
      return (await getJobState(key)) === 'true';
    } catch {
      return false;
    }
  }

  private async markFired(key: string): Promise<void> {
    try {
      await setJobState(key, 'true');
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: `Failed to persist ${key}: ${err.message}` });
    }
  }

  private async loadPending(): Promise<Pending[]> {
    try {
      const raw = await getJobState(PENDING_KEY);
      return raw ? (JSON.parse(raw) as Pending[]) : [];
    } catch {
      return [];
    }
  }

  private async savePending(pending: Pending[]): Promise<void> {
    try {
      await setJobState(PENDING_KEY, JSON.stringify(pending));
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: `Failed to persist pending list: ${err.message}` });
    }
  }

  private async sendReminders(pending: Pending[]): Promise<Pending[]> {
    const calendar = await getHoldingsEarningsCalendar();
    const next = [...pending];

    for (const entry of calendar) {
      if (entry.daysAway > this.config.daysBefore) continue;

      const key = `${REMINDED_PREFIX}${entry.symbol}_${entry.date}`;
      if (await this.alreadyFired(key)) continue;

      const payload = buildEarningsPayload(
        entry.symbol,
        entry.name,
        entry.date,
        entry.hour,
        entry.epsEstimate,
        entry.daysAway
      );
      const ok = await dispatchEarnings(payload, this.config.topic);
      if (!ok) continue;

      await this.markFired(key);
      logger.log({ level: 'info', label: LABEL, message: `EARNINGS — ${payload.message}` });
      if (!next.some((p) => p.symbol === entry.symbol && p.date === entry.date)) {
        next.push({ symbol: entry.symbol, name: entry.name, date: entry.date });
      }
    }

    return next;
  }

  // Resolve reports whose date has passed by looking up the actual EPS. Finnhub
  // publishes the number some hours after the release, so an unresolved report is
  // retried each run until it lands or the grace window closes.
  private async sendResults(pending: Pending[]): Promise<Pending[]> {
    const today = moment().startOf('day');
    const stillPending: Pending[] = [];

    for (const item of pending) {
      const reportDay = moment(item.date).startOf('day');
      if (reportDay.isAfter(today)) {
        stillPending.push(item);
        continue;
      }
      if (today.diff(reportDay, 'days') > RESULT_GRACE_DAYS) {
        logger.log({
          level: 'warn',
          label: LABEL,
          message: `Giving up on results for ${item.symbol} (${item.date}) — no actual EPS within ${RESULT_GRACE_DAYS} days`,
        });
        continue;
      }

      const key = `${RESULTED_PREFIX}${item.symbol}_${item.date}`;
      if (await this.alreadyFired(key)) continue;

      let history: any[];
      try {
        history = await getEarningsHistory(item.symbol);
      } catch (err: any) {
        logger.log({ level: 'error', label: LABEL, message: `Earnings history failed for ${item.symbol}: ${err.message}` });
        stillPending.push(item);
        continue;
      }

      const match = (history ?? []).find((h) => h?.period === item.date);
      if (!match || match.actual == null) {
        stillPending.push(item);
        continue;
      }

      const payload = buildEarningsResultPayload(
        item.symbol,
        item.name,
        item.date,
        typeof match.actual === 'number' ? match.actual : null,
        typeof match.estimate === 'number' ? match.estimate : null,
        typeof match.surprisePercent === 'number' ? match.surprisePercent : null
      );
      const ok = await dispatchEarningsResult(payload, this.config.topic);
      if (!ok) {
        stillPending.push(item);
        continue;
      }

      await this.markFired(key);
      logger.log({ level: 'info', label: LABEL, message: `EARNINGS RESULT — ${payload.message}` });
    }

    return stillPending;
  }

  async runCheck(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      let pending = await this.loadPending();
      pending = await this.sendReminders(pending);
      if (this.config.notifyResults) pending = await this.sendResults(pending);
      await this.savePending(pending);
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: err.message });
    } finally {
      this.running = false;
    }
  }

  // Publish a sample reminder immediately, bypassing the schedule and the
  // already-fired ledger, so the Settings page can offer a "Send now" test.
  async sendTest(): Promise<{ ok: boolean }> {
    const payload = buildEarningsPayload(
      'TEST',
      'Test Company Inc.',
      moment().add(1, 'day').format('YYYY-MM-DD'),
      'amc',
      2.35,
      1
    );
    return { ok: await dispatchEarnings(payload, this.config.topic) };
  }

  start(config: IEarningsReminderConfig): void {
    this.stop();
    this.config = config;
    if (!config.enabled) {
      logger.log({ level: 'info', label: LABEL, message: 'Disabled' });
      return;
    }

    void this.scheduler.start(CHECK_INTERVAL_MS, () => this.runCheck());
    logger.log({
      level: 'info',
      label: LABEL,
      message: `Started — ${config.daysBefore} day(s) before, results: ${config.notifyResults} → ${config.topic}`,
    });
  }

  stop(): void {
    this.scheduler.stop();
    logger.log({ level: 'info', label: LABEL, message: 'Stopped' });
  }

  reconfigure(config: IEarningsReminderConfig): void {
    this.start(config);
  }
}

export const earningsReminderService = new EarningsReminderService();
