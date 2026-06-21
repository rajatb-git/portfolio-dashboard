import { AlertModel, IAlertModel } from '../models/AlertModel';
import type { IAlertMonitorConfig } from '../models/AlertMonitorConfigModel';
import { isStockMarketOpen } from '../utils/marketCalendar';
import { logger } from '../utils/winston';
import { LiveQuoteController } from './LiveQuoteController';
import { dispatchAlertTriggered } from './NotificationDispatcher';

const LABEL = 'AlertMonitorService';

const conditionMet = (direction: 'above' | 'below', price: number, target: number): boolean =>
  direction === 'above' ? price >= target : price <= target;

class AlertMonitorService {
  private timer: NodeJS.Timeout | null = null;
  private config: IAlertMonitorConfig = { enabled: false, intervalMinutes: 5 };
  private running = false;

  async runCheck(): Promise<void> {
    // Guard against overlapping runs if a poll outlasts the interval.
    if (this.running) return;
    this.running = true;
    try {
      const model = await AlertModel().initialize();
      const alerts = model.getAllRecords();
      if (alerts.length === 0) return;

      // Stocks only during real trading hours; crypto trades 24/7. If there is
      // nothing to evaluate this cycle, return WITHOUT touching the network.
      const stockOpen = isStockMarketOpen();
      const toEval = alerts.filter((a) => a.type === 'crypto' || (a.type === 'stock' && stockOpen));
      if (toEval.length === 0) return;

      const quoteController = new LiveQuoteController();
      const symbolMeta = new Map<string, boolean>();
      for (const a of toEval) if (!symbolMeta.has(a.symbol)) symbolMeta.set(a.symbol, a.type === 'crypto');
      const symbols = [...symbolMeta.keys()];

      const quotes = await Promise.all(
        symbols.map((sym) => quoteController.getLiveQuote(sym, symbolMeta.get(sym)).catch((): null => null))
      );
      const priceMap = new Map(symbols.map((sym, i) => [sym, quotes[i]]));

      const now = new Date().toISOString();
      for (const alert of toEval) {
        const quote = priceMap.get(alert.symbol);
        if (!quote) continue; // leave state untouched on a fetch failure

        const price = +quote.price.toFixed(2);
        const met = conditionMet(alert.direction, price, alert.targetPrice);

        const next: IAlertModel = { ...alert, lastPrice: price, lastCheckedAt: now };
        let justTriggered = false;
        if (met && !alert.triggeredAt) {
          next.triggeredAt = now;
          justTriggered = true;
          logger.log({
            level: 'info',
            label: LABEL,
            message: `ALERT TRIGGERED — ${alert.symbol} ${alert.direction} ${alert.targetPrice} (now ${price})`,
          });
        } else if (!met && alert.triggeredAt) {
          // Condition cleared — re-arm so it can fire again on the next crossing.
          next.triggeredAt = null;
        }

        try {
          await model.insertOrUpdate(next, alert.id);
        } catch (err: any) {
          logger.log({ level: 'error', label: LABEL, message: `Failed to persist alert ${alert.id}: ${err.message}` });
        }

        // Deliver to configured channels only on the untriggered -> triggered edge.
        if (justTriggered) void dispatchAlertTriggered(next, price);
      }
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: err.message });
    } finally {
      this.running = false;
    }
  }

  start(config: IAlertMonitorConfig): void {
    this.stop();
    this.config = config;
    if (!config.enabled) {
      logger.log({ level: 'info', label: LABEL, message: 'Disabled' });
      return;
    }

    const intervalMs = Math.max(1, config.intervalMinutes) * 60 * 1000;
    this.timer = setInterval(() => {
      this.runCheck();
    }, intervalMs);
    logger.log({ level: 'info', label: LABEL, message: `Started — interval: ${config.intervalMinutes} min` });

    // Kick once on startup so freshly-met conditions surface immediately.
    this.runCheck();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.log({ level: 'info', label: LABEL, message: 'Stopped' });
    }
  }

  reconfigure(config: IAlertMonitorConfig): void {
    this.start(config);
  }
}

export const alertMonitorService = new AlertMonitorService();
