import { getJobState, setJobState } from '../models/JobRunStateModel';
import type { IMoveAlertConfig } from '../models/MoveAlertConfigModel';
import { isStockMarketOpen } from '../utils/marketCalendar';
import { PersistentInterval } from '../utils/PersistentInterval';
import { logger } from '../utils/winston';
import { buildDailyRecap } from './DailyRecapController';
import { buildMoveAlertPayload, dispatchMoveAlert } from './NotificationDispatcher';

const LABEL = 'MoveAlertService';

const today = (): string => new Date().toISOString().slice(0, 10);

class MoveAlertService {
  private readonly scheduler = new PersistentInterval('move_alert');
  private config: IMoveAlertConfig = { enabled: false, intervalMinutes: 15, thresholdPercent: 5 };
  private running = false;

  // A key fires at most once per calendar day per crossing, resetting
  // automatically the next day since the stored date won't match `today()`.
  private async alreadyNotifiedToday(key: string): Promise<boolean> {
    const stateKey = `move_alert_notified_${key}`;
    try {
      return (await getJobState(stateKey)) === today();
    } catch {
      return false;
    }
  }

  private async markNotifiedToday(key: string): Promise<void> {
    try {
      await setJobState(`move_alert_notified_${key}`, today());
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: `Failed to persist notified state for ${key}: ${err.message}` });
    }
  }

  async runCheck(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      if (!isStockMarketOpen()) return;

      const recap = await buildDailyRecap();
      const threshold = this.config.thresholdPercent;

      if (Math.abs(recap.totalDayGLPercent) >= threshold && !(await this.alreadyNotifiedToday('portfolio'))) {
        await this.markNotifiedToday('portfolio');
        const payload = buildMoveAlertPayload('portfolio', recap.totalDayGLPercent, threshold);
        logger.log({ level: 'info', label: LABEL, message: `MOVE ALERT — portfolio ${payload.message}` });
        void dispatchMoveAlert(payload);
      }

      for (const holding of recap.holdings) {
        if (Math.abs(holding.percentChange) < threshold) continue;
        if (await this.alreadyNotifiedToday(holding.symbol)) continue;

        await this.markNotifiedToday(holding.symbol);
        const payload = buildMoveAlertPayload('holding', holding.percentChange, threshold, holding.symbol);
        logger.log({ level: 'info', label: LABEL, message: `MOVE ALERT — ${payload.message}` });
        void dispatchMoveAlert(payload);
      }
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: err.message });
    } finally {
      this.running = false;
    }
  }

  start(config: IMoveAlertConfig): void {
    this.stop();
    this.config = config;
    if (!config.enabled) {
      logger.log({ level: 'info', label: LABEL, message: 'Disabled' });
      return;
    }

    const intervalMs = Math.max(1, config.intervalMinutes) * 60 * 1000;
    void this.scheduler.start(intervalMs, () => this.runCheck());
    logger.log({
      level: 'info',
      label: LABEL,
      message: `Started — interval: ${config.intervalMinutes} min, threshold: ${config.thresholdPercent}%`,
    });
  }

  stop(): void {
    this.scheduler.stop();
    logger.log({ level: 'info', label: LABEL, message: 'Stopped' });
  }

  reconfigure(config: IMoveAlertConfig): void {
    this.start(config);
  }
}

export const moveAlertService = new MoveAlertService();
