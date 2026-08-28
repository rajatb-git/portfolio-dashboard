import moment from 'moment';
import { getEarningsHistory } from '../externalApis/finnHub';
import { DEFAULT_EARNINGS_REMINDER_CONFIG, type IEarningsReminderConfig } from '../models/EarningsReminderConfigModel';
import { getJobState, setJobState } from '../models/JobRunStateModel';
import { etDateAndMinutes } from '../utils/marketCalendar';
import { PersistentInterval } from '../utils/PersistentInterval';
import { logger } from '../utils/winston';
import {
  getHoldingsEarningsCalendar,
  getHoldingsEarningsResults,
  type HoldingEarning,
  type HoldingEarningResult,
} from './HoldingsEarningsController';
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
// Finnhub's /stock/earnings keys each row by the fiscal period END date, not the
// day the numbers were announced: a quarter ending 2026-07-31 is reported weeks
// later. This bounds how far back a period may sit from the report that
// announced it, so the right quarter is matched and an older one never is.
const MAX_PERIOD_LAG_DAYS = 120;

type Pending = { symbol: string; name: string; date: string };

// The figures a release publishes, from whichever source had them.
type ResultFigures = Pick<
  HoldingEarningResult,
  'epsActual' | 'epsEstimate' | 'revenueActual' | 'revenueEstimate' | 'surprisePercent'
>;

const daysBetween = (from: string, to: string): number =>
  moment(to, 'YYYY-MM-DD').diff(moment(from, 'YYYY-MM-DD'), 'days');

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

  // Every upcoming report is tracked as soon as it reaches the calendar, not only
  // the ones a reminder went out for: a report whose heads-up never landed (quiet
  // hours, a restart, results switched on after the fact) still gets its numbers
  // announced once they publish. Reports that already published are tracked too,
  // so a result that landed while nothing was watching is still announced once —
  // the grace window in sendResults is what keeps that from reaching back weeks.
  private trackReports(pending: Pending[], calendar: HoldingEarning[], published: HoldingEarningResult[]): Pending[] {
    const next = [...pending];
    const track = (symbol: string, name: string, date: string) => {
      if (!next.some((p) => p.symbol === symbol && p.date === date)) next.push({ symbol, name, date });
    };

    for (const entry of calendar) track(entry.symbol, entry.name, entry.date);
    for (const result of published) track(result.symbol, result.name, result.date);
    return next;
  }

  private async publishedResults(): Promise<HoldingEarningResult[]> {
    try {
      return await getHoldingsEarningsResults();
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: `Earnings results lookup failed: ${err.message}` });
      return [];
    }
  }

  private prune(pending: Pending[], today: string): Pending[] {
    return pending.filter((item) => daysBetween(item.date, today) <= RESULT_GRACE_DAYS);
  }

  private async sendReminders(calendar: HoldingEarning[]): Promise<void> {
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
    }
  }

  // The calendar entry gains its actual numbers within hours of a release, but not
  // always — /stock/earnings is the second source. Its rows are keyed by the
  // fiscal period end rather than the announcement date, so match the latest
  // quarter that closed on or before the report and near enough to be it.
  private async resultFromHistory(item: Pending): Promise<ResultFigures | null> {
    let history: any[];
    try {
      history = await getEarningsHistory(item.symbol);
    } catch (err: any) {
      logger.log({
        level: 'error',
        label: LABEL,
        message: `Earnings history failed for ${item.symbol}: ${err.message}`,
      });
      return null;
    }

    let match: any = null;
    for (const row of history ?? []) {
      if (!row?.period || row.actual == null) continue;
      if (row.period > item.date || daysBetween(row.period, item.date) > MAX_PERIOD_LAG_DAYS) continue;
      if (!match || row.period > match.period) match = row;
    }
    if (!match) return null;

    return {
      epsActual: typeof match.actual === 'number' ? match.actual : null,
      epsEstimate: typeof match.estimate === 'number' ? match.estimate : null,
      surprisePercent: typeof match.surprisePercent === 'number' ? match.surprisePercent : null,
      revenueActual: null,
      revenueEstimate: null,
    };
  }

  // Announce the numbers for reports whose date has passed. They publish some
  // hours after the release, so an unresolved report is retried each run until
  // they land or the grace window closes.
  private async sendResults(pending: Pending[], published: HoldingEarningResult[], today: string): Promise<Pending[]> {
    const stillPending: Pending[] = [];

    for (const item of pending) {
      if (item.date > today) {
        stillPending.push(item);
        continue;
      }
      if (daysBetween(item.date, today) > RESULT_GRACE_DAYS) {
        logger.log({
          level: 'warn',
          label: LABEL,
          message: `Giving up on results for ${item.symbol} (${item.date}) — no actual EPS within ${RESULT_GRACE_DAYS} days`,
        });
        continue;
      }

      const key = `${RESULTED_PREFIX}${item.symbol}_${item.date}`;
      if (await this.alreadyFired(key)) continue;

      const figures: ResultFigures | null =
        published.find((r) => r.symbol === item.symbol && r.date === item.date) ?? (await this.resultFromHistory(item));
      if (!figures || figures.epsActual === null) {
        stillPending.push(item);
        continue;
      }

      const payload = buildEarningsResultPayload(
        item.symbol,
        item.name,
        item.date,
        figures.epsActual,
        figures.epsEstimate,
        figures.surprisePercent,
        figures.revenueActual,
        figures.revenueEstimate
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
      const today = etDateAndMinutes().dateStr;
      const calendar = await getHoldingsEarningsCalendar();
      const published = this.config.notifyResults ? await this.publishedResults() : [];
      let pending = this.trackReports(await this.loadPending(), calendar, published);
      await this.sendReminders(calendar);
      pending = this.config.notifyResults
        ? await this.sendResults(pending, published, today)
        : this.prune(pending, today);
      await this.savePending(pending);
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: err.message });
    } finally {
      this.running = false;
    }
  }

  // Publish a sample immediately, bypassing the schedule and the already-fired
  // ledger, so the Settings page can offer a "Send now" test. With results turned
  // on it sends both halves — the heads-up and the numbers that follow it — since
  // the result is the one worth seeing the shape of.
  async sendTest(): Promise<{ ok: boolean }> {
    const reminder = buildEarningsPayload(
      'TEST',
      'Test Company Inc.',
      moment().add(1, 'day').format('YYYY-MM-DD'),
      'amc',
      2.35,
      1
    );
    const ok = await dispatchEarnings(reminder, this.config.topic);
    if (!this.config.notifyResults) return { ok };

    const result = buildEarningsResultPayload(
      'TEST',
      'Test Company Inc.',
      moment().subtract(1, 'day').format('YYYY-MM-DD'),
      2.48,
      2.35,
      5.5,
      57_000_000_000,
      54_900_000_000
    );
    return { ok: (await dispatchEarningsResult(result, this.config.topic)) && ok };
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
