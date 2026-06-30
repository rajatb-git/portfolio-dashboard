import { AccountModel } from '../models/AccountModel';
import { HoldingsModel } from '../models/HoldingsModel';
import type { IPriceStoreModel } from '../models/PriceStoreModel';
import {
  DEFAULT_TRADING_SUMMARY_CONFIG,
  getTradingSummaryConfig,
  type ITradingSummaryConfig,
} from '../models/TradingSummaryConfigModel';
import { etDateAndMinutes, getMarketCloseMinutes, isTradingDay } from '../utils/marketCalendar';
import { logger } from '../utils/winston';
import { LiveQuoteController } from './LiveQuoteController';
import { mqttPublisher } from './MqttPublisher';

const LABEL = 'TradingSummaryService';

// Broad-market proxies. These are ETFs, so Finnhub's free tier returns c=0 and
// LiveQuoteController transparently falls back to NASDAQ to price them.
const MARKET_INDICES = [
  { symbol: 'SPY', label: 'S&P 500' },
  { symbol: 'QQQ', label: 'Nasdaq 100' },
  { symbol: 'DIA', label: 'Dow Jones' },
];

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
      const holdingsModel = await HoldingsModel().initialize();
      const holdings = holdingsModel.getAllRecords();
      const accountModel = await AccountModel().initialize();
      const accounts = accountModel.getAllRecords();

      const quoteController = new LiveQuoteController();
      const isCrypto = new Map<string, boolean>();
      for (const h of holdings) if (!isCrypto.has(h.symbol)) isCrypto.set(h.symbol, h.type === 'crypto');
      for (const idx of MARKET_INDICES) if (!isCrypto.has(idx.symbol)) isCrypto.set(idx.symbol, false);
      const symbols = [...isCrypto.keys()];

      const quotes = await Promise.all(
        symbols.map((s) => quoteController.getLiveQuote(s, isCrypto.get(s)).catch((): null => null))
      );
      const quoteMap = new Map<string, IPriceStoreModel | null>(symbols.map((s, i) => [s, quotes[i]]));

      const generatedAt = new Date().toISOString();
      const base = { slot, generatedAt };
      let published = 0;
      const publish = async (payload: object): Promise<void> => {
        if (await mqttPublisher.publish(JSON.stringify(payload), config.topic)) published += 1;
      };

      // 1) Market summary — public index data.
      const indices = MARKET_INDICES.map((idx) => {
        const q = quoteMap.get(idx.symbol);
        return q
          ? {
              symbol: idx.symbol,
              label: idx.label,
              price: +q.price.toFixed(2),
              percentChange: +q.percentChange.toFixed(2),
              change: +q.change.toFixed(2),
            }
          : null;
      }).filter((x): x is NonNullable<typeof x> => x !== null);

      if (indices.length > 0) {
        await publish({
          ...base,
          kind: 'market',
          title: `Market summary — ${SLOT_LABEL[slot]}`,
          message: indices.map((i) => `${i.label} ${signedPct(i.percentChange)}`).join(' · '),
          indices,
        });
      }

      // 2) Per-account day P&L — personal data, user's broker only.
      const accountName = new Map(accounts.map((a) => [a.id, a.name]));
      const byAccount = new Map<string, { account: string; dayGL: number; prevValue: number; marketValue: number }>();
      for (const h of holdings) {
        const q = quoteMap.get(h.symbol);
        if (!q) continue;
        const entry = byAccount.get(h.accountId) ?? {
          account: accountName.get(h.accountId) ?? 'Unknown account',
          dayGL: 0,
          prevValue: 0,
          marketValue: 0,
        };
        entry.dayGL += h.qty * q.change;
        entry.prevValue += h.qty * q.prevClose;
        entry.marketValue += h.qty * q.price;
        byAccount.set(h.accountId, entry);
      }
      const accountsPnl = [...byAccount.values()]
        .map((e) => ({
          account: e.account,
          dayGL: +e.dayGL.toFixed(2),
          dayGLPercent: e.prevValue > 0 ? +((e.dayGL / e.prevValue) * 100).toFixed(2) : 0,
          marketValue: +e.marketValue.toFixed(2),
        }))
        .sort((a, b) => b.marketValue - a.marketValue);

      if (accountsPnl.length > 0) {
        const totalDayGL = +accountsPnl.reduce((s, a) => s + a.dayGL, 0).toFixed(2);
        const totalPrev = [...byAccount.values()].reduce((s, e) => s + e.prevValue, 0);
        const totalPct = totalPrev > 0 ? +((totalDayGL / totalPrev) * 100).toFixed(2) : 0;
        await publish({
          ...base,
          kind: 'accountPnl',
          title: `Today's P&L — ${SLOT_LABEL[slot]}`,
          message: `Total ${usd(totalDayGL)} (${signedPct(totalPct)}) · ${accountsPnl
            .map((a) => `${a.account} ${usd(a.dayGL)} (${signedPct(a.dayGLPercent)})`)
            .join(' · ')}`,
          totalDayGL,
          totalDayGLPercent: totalPct,
          accounts: accountsPnl,
        });
      }

      // 3) Movement of the largest holdings — personal data, user's broker only.
      const bySymbol = new Map<
        string,
        { symbol: string; name: string; percentChange: number; dayGL: number; marketValue: number }
      >();
      for (const h of holdings) {
        const q = quoteMap.get(h.symbol);
        if (!q) continue;
        const entry = bySymbol.get(h.symbol) ?? {
          symbol: h.symbol,
          name: h.name,
          percentChange: +q.percentChange.toFixed(2),
          dayGL: 0,
          marketValue: 0,
        };
        entry.dayGL += h.qty * q.change;
        entry.marketValue += h.qty * q.price;
        bySymbol.set(h.symbol, entry);
      }
      const topHoldings = [...bySymbol.values()]
        .sort((a, b) => b.marketValue - a.marketValue)
        .slice(0, config.topHoldingsCount)
        .map((e) => ({
          symbol: e.symbol,
          name: e.name,
          percentChange: e.percentChange,
          dayGL: +e.dayGL.toFixed(2),
          marketValue: +e.marketValue.toFixed(2),
        }));

      if (topHoldings.length > 0) {
        await publish({
          ...base,
          kind: 'holdings',
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
