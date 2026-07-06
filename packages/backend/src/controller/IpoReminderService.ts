import moment from 'moment';
import type { IIpoReminderConfig } from '../models/IpoReminderConfigModel';
import { IPODBModel } from '../models/IPOModel';
import { WatchedIPODBModel } from '../models/WatchedIPOModel';
import { PersistentInterval } from '../utils/PersistentInterval';
import { logger } from '../utils/winston';
import { buildIpoReminderPayload, dispatchIpoReminder } from './NotificationDispatcher';

const LABEL = 'IpoReminderService';

// Day-granularity data — a fixed interval is fine, no need to expose it as a setting.
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

class IpoReminderService {
  private readonly scheduler = new PersistentInterval('ipo_reminder');
  private config: IIpoReminderConfig = { enabled: true, daysBefore: 1 };
  private running = false;

  async runCheck(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const watchedModel = await WatchedIPODBModel().initialize();
      const watched = watchedModel.getAllRecords();
      if (watched.length === 0) return;

      const ipoModel = await IPODBModel().initialize();
      const bySymbol = new Map(ipoModel.getAllRecords().map((ipo) => [ipo.symbol, ipo]));

      for (const entry of watched) {
        // Keep the watched date in sync with the live calendar in case the IPO was postponed.
        const latest = bySymbol.get(entry.symbol);
        const date = latest?.date || entry.date;
        if (latest && latest.date !== entry.date) {
          await watchedModel.insertOrUpdate({ date: latest.date }, entry.symbol);
        }

        if (entry.reminderSent) continue;
        if (moment(date).diff(moment(), 'days') > this.config.daysBefore) continue;

        await watchedModel.insertOrUpdate({ reminderSent: true }, entry.symbol);
        const payload = buildIpoReminderPayload(entry.symbol, entry.name, date);
        logger.log({ level: 'info', label: LABEL, message: `IPO REMINDER — ${payload.message}` });
        void dispatchIpoReminder(payload);
      }
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: err.message });
    } finally {
      this.running = false;
    }
  }

  start(config: IIpoReminderConfig): void {
    this.stop();
    this.config = config;
    if (!config.enabled) {
      logger.log({ level: 'info', label: LABEL, message: 'Disabled' });
      return;
    }

    void this.scheduler.start(CHECK_INTERVAL_MS, () => this.runCheck());
    logger.log({ level: 'info', label: LABEL, message: `Started — reminding ${config.daysBefore} day(s) before` });
  }

  stop(): void {
    this.scheduler.stop();
    logger.log({ level: 'info', label: LABEL, message: 'Stopped' });
  }

  reconfigure(config: IIpoReminderConfig): void {
    this.start(config);
  }
}

export const ipoReminderService = new IpoReminderService();
