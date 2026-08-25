import moment from 'moment';
import {
  DEFAULT_DIVIDEND_WATCH_CONFIG,
  type IDividendWatchConfig,
} from '../models/DividendWatchConfigModel';
import { getJobState, setJobState } from '../models/JobRunStateModel';
import { PersistentInterval } from '../utils/PersistentInterval';
import { logger } from '../utils/winston';
import { buildDividendSummary } from './DividendController';
import { buildDividendPayload, dispatchDividend } from './NotificationDispatcher';

const LABEL = 'DividendWatchService';

// Dividend calendars move at day granularity and the underlying lookup is cached
// for hours, so there is nothing to gain from polling more often than this.
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

const FIRED_PREFIX = 'dividend_fired_';

class DividendWatchService {
  private readonly scheduler = new PersistentInterval('dividend_watch');
  private config: IDividendWatchConfig = DEFAULT_DIVIDEND_WATCH_CONFIG;
  private running = false;

  private async alreadyFired(key: string): Promise<boolean> {
    try {
      return (await getJobState(`${FIRED_PREFIX}${key}`)) === 'true';
    } catch {
      return false;
    }
  }

  private async markFired(key: string): Promise<void> {
    try {
      await setJobState(`${FIRED_PREFIX}${key}`, 'true');
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: `Failed to persist ${key}: ${err.message}` });
    }
  }

  async runCheck(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const summary = await buildDividendSummary();
      const today = moment().startOf('day');

      for (const event of summary.upcoming) {
        if (event.event === 'ex_dividend' && !this.config.notifyExDate) continue;
        if (event.event === 'payment' && !this.config.notifyPayment) continue;

        const daysAway = moment(event.date).startOf('day').diff(today, 'days');
        if (daysAway > this.config.daysBefore) continue;

        // Keyed on the dated event, so next quarter's identical event fires again.
        const key = `${event.symbol}_${event.event}_${event.date}`;
        if (await this.alreadyFired(key)) continue;

        const holding = summary.holdings.find((h) => h.symbol === event.symbol);
        const payload = buildDividendPayload(
          event.symbol,
          event.name,
          event.event,
          event.date,
          holding?.amountPerShare ?? 0,
          event.amount
        );

        const ok = await dispatchDividend(payload, this.config.topic);
        if (!ok) continue;

        await this.markFired(key);
        logger.log({ level: 'info', label: LABEL, message: `DIVIDEND — ${payload.message}` });
      }
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: err.message });
    } finally {
      this.running = false;
    }
  }

  // Publish a sample notice immediately, bypassing the schedule and the fired
  // ledger, so the Settings page can offer a "Send now" test.
  async sendTest(): Promise<{ ok: boolean }> {
    const payload = buildDividendPayload(
      'TEST',
      'Test Company Inc.',
      'payment',
      moment().add(3, 'days').format('YYYY-MM-DD'),
      0.24,
      48
    );
    return { ok: await dispatchDividend(payload, this.config.topic) };
  }

  start(config: IDividendWatchConfig): void {
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
      message: `Started — ${config.daysBefore} day(s) before, ex-date: ${config.notifyExDate}, payment: ${config.notifyPayment} → ${config.topic}`,
    });
  }

  stop(): void {
    this.scheduler.stop();
    logger.log({ level: 'info', label: LABEL, message: 'Stopped' });
  }

  reconfigure(config: IDividendWatchConfig): void {
    this.start(config);
  }
}

export const dividendWatchService = new DividendWatchService();
