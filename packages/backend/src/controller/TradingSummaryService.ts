import {
  DEFAULT_TRADING_SUMMARY_CONFIG,
  getTradingSummaryConfig,
  type ITradingSummaryConfig,
} from '../models/TradingSummaryConfigModel';
import { etDateAndMinutes, getMarketCloseMinutes, isTradingDay } from '../utils/marketCalendar';
import { logger } from '../utils/winston';
import { buildDailyRecap } from './DailyRecapController';
import { mqttPublisher } from './MqttPublisher';

const LABEL = 'TradingSummaryService';

type SlotName = 'morning' | 'midday' | 'close';
export type SummarySlot = SlotName | 'test';

const SLOT_LABEL: Record<SummarySlot, string> = {
  morning: 'Morning',
  midday: 'Midday',
  close: 'Market close',
  test: 'Test',
};

// Fixed firing minutes (ET, since midnight). Close is resolved per-day so it
// lands on the early close on half days.
const MORNING_MIN = 9 * 60 + 35;
const MIDDAY_MIN = 12 * 60 + 30;
// A slot fires once when the clock first enters [target, target + GRACE). The
// window absorbs the 60s tick granularity and avoids retroactively firing slots
// that already passed when the server starts mid-day.
const GRACE_MIN = 30;

const signedPct = (n: number): string => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
const usd = (n: number): string => `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`;

class TradingSummaryService {
  private timer: NodeJS.Timeout | null = null;
  private config: ITradingSummaryConfig = DEFAULT_TRADING_SUMMARY_CONFIG;
  // Date string (ET) each slot last fired, to fire each slot at most once per day.
  private lastFired: Record<SlotName, string> = { morning: '', midday: '', close: '' };

  private tick(): void {
    if (!this.config.enabled) return;
    const now = new Date();
    if (!isTradingDay(now)) return;

    const { dateStr, minutes } = etDateAndMinutes(now);
    const targets: Array<{ name: SlotName; min: number }> = [
      { name: 'morning', min: MORNING_MIN },
      { name: 'midday', min: MIDDAY_MIN },
      { name: 'close', min: getMarketCloseMinutes(now) },
    ];

    for (const t of targets) {
      if (this.lastFired[t.name] === dateStr) continue;
      if (minutes >= t.min && minutes < t.min + GRACE_MIN) {
        // Mark before awaiting so an overlapping tick can't double-fire the slot.
        this.lastFired[t.name] = dateStr;
        void this.publishSummaries(t.name, this.config);
      }
    }
  }

  // Personal data note: the account P&L and holdings summaries below contain the
  // user's own positions and gain/loss. They are published ONLY to the user's
  // self-hosted MQTT broker (their notification channel), never to any external
  // AI provider — so the AI data-privacy rule is not in play here.
  private async publishSummaries(slot: SummarySlot, config: ITradingSummaryConfig): Promise<number> {
    if (!mqttPublisher.isEnabled()) {
      logger.log({ level: 'warn', label: LABEL, message: `Skipped ${slot} summary — MQTT is not enabled` });
      return 0;
    }

    try {
      const recap = await buildDailyRecap();
      logger.log({
        level: 'info',
        label: LABEL,
        message: `${slot} recap: ${recap.indices.length} indices, ${recap.accounts.length} accounts, ${recap.holdings.length} holdings`,
      });

      const base = { slot, generatedAt: recap.generatedAt };
      let published = 0;
      // Each summary goes to its own subtopic (…/market, …/pnl, …/holdings). Publishing
      // all three to one topic made consumers (Home Assistant, mobile push bridges)
      // coalesce/retain them into a single notification — hence "only one arrived".
      const publish = async (kind: string, payload: object): Promise<void> => {
        const topic = `${config.topic}/${kind}`;
        const ok = await mqttPublisher.publish(JSON.stringify({ ...base, kind, ...payload }), topic);
        if (ok) published += 1;
        logger.log({
          level: ok ? 'info' : 'warn',
          label: LABEL,
          message: `${ok ? 'published' : 'FAILED to publish'} ${slot} ${kind} → ${topic}`,
        });
      };

      // 1) Market summary — public index data.
      const { indices } = recap;
      if (indices.length > 0) {
        await publish('market', {
          title: `Market summary — ${SLOT_LABEL[slot]}`,
          message: indices.map((i) => `${i.label} ${signedPct(i.percentChange)}`).join(' · '),
          indices,
        });
      }

      // 2) Per-account day P&L — personal data, user's broker only.
      const accountsPnl = recap.accounts;
      if (accountsPnl.length > 0) {
        await publish('pnl', {
          title: `Today's P&L — ${SLOT_LABEL[slot]}`,
          message: `Total ${usd(recap.totalDayGL)} (${signedPct(recap.totalDayGLPercent)}) · ${accountsPnl
            .map((a) => `${a.account} ${usd(a.dayGL)} (${signedPct(a.dayGLPercent)})`)
            .join(' · ')}`,
          totalDayGL: recap.totalDayGL,
          totalDayGLPercent: recap.totalDayGLPercent,
          accounts: accountsPnl,
        });
      } else {
        logger.log({
          level: 'warn',
          label: LABEL,
          message: `${slot}: no priced holdings — P&L and holdings summaries skipped (check holdings/accounts and live quotes)`,
        });
      }

      // 3) Movement of the largest holdings — personal data, user's broker only.
      const topHoldings = [...recap.holdings]
        .sort((a, b) => b.marketValue - a.marketValue)
        .slice(0, config.topHoldingsCount);

      if (topHoldings.length > 0) {
        await publish('holdings', {
          title: `Top holdings — ${SLOT_LABEL[slot]}`,
          message: topHoldings.map((h) => `${h.symbol} ${signedPct(h.percentChange)}`).join(' · '),
          holdings: topHoldings,
        });
      }

      logger.log({ level: 'info', label: LABEL, message: `Published ${published} ${slot} summary message(s)` });
      return published;
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: `Failed ${slot} summary: ${err.message}` });
      return 0;
    }
  }

  // Send all summaries immediately using the persisted config, ignoring the
  // schedule and enabled gate so the Settings page can offer a "Send now" test.
  async sendTest(): Promise<{ published: number; mqttEnabled: boolean }> {
    const config = await getTradingSummaryConfig();
    const published = await this.publishSummaries('test', config);
    return { published, mqttEnabled: mqttPublisher.isEnabled() };
  }

  start(config: ITradingSummaryConfig): void {
    this.stop();
    this.config = config;
    if (!config.enabled) {
      logger.log({ level: 'info', label: LABEL, message: 'Disabled' });
      return;
    }
    this.timer = setInterval(() => this.tick(), 60 * 1000);
    logger.log({
      level: 'info',
      label: LABEL,
      message: `Started — slots 9:35 / 12:30 / close ET, top ${config.topHoldingsCount} holdings`,
    });
    this.tick();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.log({ level: 'info', label: LABEL, message: 'Stopped' });
    }
  }

  reconfigure(config: ITradingSummaryConfig): void {
    this.start(config);
  }
}

export const tradingSummaryService = new TradingSummaryService();
