import { getJobState, setJobState } from '../models/JobRunStateModel';
import {
  DEFAULT_TRADING_SUMMARY_CONFIG,
  getTradingSummaryConfig,
  type ITradingSummaryConfig,
} from '../models/TradingSummaryConfigModel';
import { etDateAndMinutes, getMarketCloseMinutes, isTradingDay } from '../utils/marketCalendar';
import { logger } from '../utils/winston';
import { buildDailyRecap } from './DailyRecapController';
import { mqttPublisher } from './MqttPublisher';
import { dispatchSummary } from './NotificationDispatcher';

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

const signedPct = (n: number): string => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
const usd = (n: number): string => `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`;

class TradingSummaryService {
  private timer: NodeJS.Timeout | null = null;
  private config: ITradingSummaryConfig = DEFAULT_TRADING_SUMMARY_CONFIG;
  // Date string (ET) each slot last fired, to fire each slot at most once per day.
  private lastFired: Record<SlotName, string> = { morning: '', midday: '', close: '' };

  private async hydrateLastFired(): Promise<void> {
    const slots: SlotName[] = ['morning', 'midday', 'close'];
    await Promise.all(
      slots.map(async (slot) => {
        try {
          const value = await getJobState(`trading_summary_${slot}`);
          if (value) this.lastFired[slot] = value;
        } catch (err: any) {
          logger.log({ level: 'error', label: LABEL, message: `Failed to read ${slot} fired state: ${err.message}` });
        }
      })
    );
  }

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

    // A slot is due once its ET time has arrived (minutes >= target) — NOT only
    // inside a narrow window. A window meant a backend that wasn't running at the
    // exact slot time (a machine that isn't up 24/7, a restart or redeploy just
    // after the slot) skipped that day's summary forever. Firing on "time has
    // passed and not yet sent today" makes the day's summary arrive whenever the
    // server is next up.
    //
    // Deliver only the LATEST due-but-unsent slot, and never one scheduled before
    // a slot already sent today. So an always-on server still gets morning, then
    // midday, then close in order, while a server first started in the evening
    // gets a single current close summary instead of a burst of stale
    // "Morning"/"Midday" ones built from after-hours numbers.
    let latestSentMin = -Infinity;
    for (const t of targets) {
      if (this.lastFired[t.name] === dateStr) latestSentMin = Math.max(latestSentMin, t.min);
    }

    let due: { name: SlotName; min: number } | null = null;
    for (const t of targets) {
      if (this.lastFired[t.name] === dateStr) continue;
      if (t.min <= latestSentMin) continue;
      if (minutes >= t.min && (!due || t.min > due.min)) due = t;
    }
    if (due) void this.fireSlot(due.name, dateStr);
  }

  private async fireSlot(slot: SlotName, dateStr: string): Promise<void> {
    // Optimistically claim the slot in memory so an overlapping tick can't
    // double-fire it while this publish is in flight. Only commit the DURABLE
    // "fired today" watermark AFTER a successful publish; if it fails (broker
    // down, empty recap), release the claim so a later tick — or a restart
    // within the grace window — retries instead of going permanently silent.
    if (this.lastFired[slot] === dateStr) return;
    this.lastFired[slot] = dateStr;

    let published = 0;
    try {
      published = await this.publishSummaries(slot, this.config);
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: `Failed ${slot} summary: ${err.message}` });
    }

    if (published > 0) {
      try {
        await setJobState(`trading_summary_${slot}`, dateStr);
      } catch (err: any) {
        logger.log({ level: 'error', label: LABEL, message: `Failed to persist ${slot} fired state: ${err.message}` });
      }
    } else if (this.lastFired[slot] === dateStr) {
      this.lastFired[slot] = '';
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
      const publish = async (
        kind: string,
        payload: { title: string; message: string } & Record<string, unknown>
      ): Promise<void> => {
        const topic = `${config.topic}/${kind}`;
        const body = { ...base, kind, ...payload };
        const ok = await dispatchSummary(body.title, body.message, body, topic);
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
    void this.hydrateLastFired().then(() => this.tick());
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
