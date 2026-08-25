import { HeldNotificationDBModel, type IHeldNotification } from '../models/HeldNotificationModel';
import {
  DEFAULT_QUIET_HOURS_CONFIG,
  type IQuietHoursConfig,
} from '../models/QuietHoursConfigModel';
import { type NotificationKind, recordNotification } from '../models/NotificationHistoryModel';
import { etDateAndMinutes } from '../utils/marketCalendar';
import { logger } from '../utils/winston';
import { mqttPublisher } from './MqttPublisher';

const LABEL = 'QuietHoursService';

// What to do with a notification that arrives right now.
export type Gate = 'send' | 'hold' | 'drop';

// Kinds that always go out. Summaries fire at times the user chose explicitly,
// tests are user-initiated, and the digest itself is what ends the quiet window.
const ALWAYS_SEND: ReadonlySet<NotificationKind> = new Set(['summary', 'test', 'digest']);

const CHECK_INTERVAL_MS = 60 * 1000;

// Publishes directly through mqttPublisher rather than the dispatcher, so the
// dispatcher can depend on this service without a circular import.
class QuietHoursService {
  private config: IQuietHoursConfig = DEFAULT_QUIET_HOURS_CONFIG;
  private timer: NodeJS.Timeout | null = null;
  private wasQuiet = false;
  private digestTopic = 'portfolio-dashboard/alerts';

  configure(config: IQuietHoursConfig, digestTopic?: string): void {
    this.config = config;
    if (digestTopic) this.digestTopic = digestTopic;
    this.wasQuiet = this.isQuietNow();
    logger.log({
      level: 'info',
      label: LABEL,
      message: config.enabled
        ? `Quiet hours ${config.startHour}:00–${config.endHour}:00 ET, mode ${config.mode}, critical override ${
            config.allowCritical ? `at ${config.criticalThresholdPercent}%` : 'off'
          }`
        : 'Disabled',
    });
  }

  isQuietNow(now: Date = new Date()): boolean {
    if (!this.config.enabled) return false;
    const { startHour, endHour } = this.config;
    if (startHour === endHour) return false;
    const hour = Math.floor(etDateAndMinutes(now).minutes / 60);
    // A window whose start is after its end wraps past midnight.
    return startHour < endHour ? hour >= startHour && hour < endHour : hour >= startHour || hour < endHour;
  }

  // severityPercent is the magnitude of the move behind the notification, when
  // there is one — it is what the critical override is measured against.
  gate(kind: NotificationKind, severityPercent?: number): Gate {
    if (ALWAYS_SEND.has(kind)) return 'send';
    if (!this.isQuietNow()) return 'send';
    if (
      this.config.allowCritical &&
      severityPercent !== undefined &&
      Math.abs(severityPercent) >= this.config.criticalThresholdPercent
    ) {
      return 'send';
    }
    return this.config.mode === 'digest' ? 'hold' : 'drop';
  }

  async hold(entry: Omit<IHeldNotification, 'heldAt'>): Promise<void> {
    try {
      const model = await HeldNotificationDBModel().initialize();
      await model.insertOne({ ...entry, heldAt: new Date().toISOString() });
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: `Failed to hold notification: ${err.message}` });
    }
  }

  // Drain everything parked during the window into one summary message.
  async flush(): Promise<number> {
    let held: Array<IHeldNotification & { id: string }>;
    try {
      const model = await HeldNotificationDBModel().initialize();
      held = model.getAllRecords();
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: `Failed to read held notifications: ${err.message}` });
      return 0;
    }
    if (held.length === 0) return 0;

    const byKind = new Map<string, number>();
    for (const item of held) byKind.set(item.kind, (byKind.get(item.kind) ?? 0) + 1);
    const breakdown = [...byKind.entries()].map(([kind, count]) => `${count} ${kind}`).join(', ');

    const payload = {
      kind: 'digest' as const,
      heldCount: held.length,
      since: held[0].heldAt,
      title: `${held.length} notification${held.length === 1 ? '' : 's'} while you were away`,
      message: breakdown,
      items: held.map(({ kind, symbol, title, message, heldAt }) => ({ kind, symbol, title, message, heldAt })),
    };

    const ok = await mqttPublisher.publish(JSON.stringify(payload), this.digestTopic);
    try {
      await recordNotification({
        kind: 'digest',
        symbol: '',
        title: payload.title,
        message: payload.message,
        topic: this.digestTopic,
        delivered: ok,
        suppressed: false,
      });
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: `Failed to record digest: ${err.message}` });
    }

    // Only clear the queue once the digest is actually on the broker, so a
    // failed publish retries on the next tick instead of losing the backlog.
    if (!ok) {
      logger.log({ level: 'warn', label: LABEL, message: `Digest publish failed — keeping ${held.length} held` });
      return 0;
    }

    try {
      const model = await HeldNotificationDBModel().initialize();
      for (const item of held) await model.deleteById(item.id);
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: `Failed to clear held notifications: ${err.message}` });
    }

    logger.log({ level: 'info', label: LABEL, message: `Flushed digest of ${held.length} notification(s)` });
    return held.length;
  }

  private tick(): void {
    const quiet = this.isQuietNow();
    // Flush on the falling edge, and also when the process comes up outside the
    // window with a backlog left over from a night it was down.
    if (this.wasQuiet && !quiet) void this.flush();
    this.wasQuiet = quiet;
  }

  start(): void {
    this.stop();
    this.wasQuiet = this.isQuietNow();
    this.timer = setInterval(() => this.tick(), CHECK_INTERVAL_MS);
    if (!this.wasQuiet) void this.flush();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const quietHoursService = new QuietHoursService();
