import { getJobState, setJobState } from '../models/JobRunStateModel';
import { DEFAULT_MOVE_ALERT_CONFIG, type IMoveAlertConfig } from '../models/MoveAlertConfigModel';
import { etDateAndMinutes, isStockMarketOpen } from '../utils/marketCalendar';
import { PersistentInterval } from '../utils/PersistentInterval';
import { logger } from '../utils/winston';
import { buildDailyRecap, type HoldingMovement } from './DailyRecapController';
import {
  buildMoveAlertPayload,
  buildSpikeAlertPayload,
  dispatchMoveAlert,
  type MoveAlertPayload,
} from './NotificationDispatcher';

const LABEL = 'MoveAlertService';

const LEVEL_KEY_PREFIX = 'move_alert_level_';
const OBSERVATIONS_KEY = 'move_alert_observations';

// One rolling price-change track per symbol: the ET date it belongs to, the
// [epochMs, dayPercentChange] samples inside the spike window, and the epochMs of
// the last spike fired (its cooldown).
type SymbolTrack = { d: string; pts: [number, number][]; cd: number };
type Observations = Record<string, SymbolTrack>;

// Which asset classes are live right now. Crypto never stops trading, and a stock
// move that landed at the close still deserves to reach the user afterwards, so
// neither is tied to the equity session being open.
type EvalScope = { stocks: boolean; crypto: boolean };

// The ET trading date. Level bookkeeping rolls with the market day, not UTC —
// a UTC rollover lands at 8pm ET and would re-announce the same day's move
// during the after-hours checks.
const today = (): string => etDateAndMinutes().dateStr;

class MoveAlertService {
  private readonly scheduler = new PersistentInterval('move_alert');
  private config: IMoveAlertConfig = DEFAULT_MOVE_ALERT_CONFIG;
  private running = false;

  private evalScope(): EvalScope {
    if (isStockMarketOpen()) return { stocks: true, crypto: true };
    return { stocks: this.config.includeAfterHours, crypto: this.config.cryptoAlwaysOn };
  }

  // The move size last announced for this key today, or 0 if none. The stored
  // date stamp makes the level reset itself on the next calendar day.
  private async getNotifiedLevel(key: string): Promise<number> {
    try {
      const raw = await getJobState(`${LEVEL_KEY_PREFIX}${key}`);
      if (!raw) return 0;
      const [date, level] = raw.split(':');
      return date === today() ? Number(level) || 0 : 0;
    } catch {
      return 0;
    }
  }

  private async setNotifiedLevel(key: string, level: number): Promise<void> {
    try {
      await setJobState(`${LEVEL_KEY_PREFIX}${key}`, `${today()}:${level}`);
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: `Failed to persist level for ${key}: ${err.message}` });
    }
  }

  // The highest escalation rung a move of `percentChange` has reached, or null if
  // it is still under the base threshold. With no escalation step configured the
  // only rung is the threshold itself, which is the once-per-day behaviour.
  private levelFor(percentChange: number): number | null {
    const { thresholdPercent, escalationStepPercent } = this.config;
    const magnitude = Math.abs(percentChange);
    if (magnitude < thresholdPercent) return null;
    if (escalationStepPercent <= 0) return thresholdPercent;
    const rungs = Math.floor((magnitude - thresholdPercent) / escalationStepPercent);
    return +(thresholdPercent + rungs * escalationStepPercent).toFixed(2);
  }

  // Announce a move once per rung per direction, so a position sliding from -5%
  // to -8% to -11% reports each leg instead of going quiet after the first.
  private async checkThreshold(
    scope: 'holding' | 'portfolio',
    percentChange: number,
    symbol?: string
  ): Promise<void> {
    const level = this.levelFor(percentChange);
    if (level === null) return;

    const key = `${symbol ?? 'portfolio'}:${percentChange >= 0 ? 'up' : 'down'}`;
    if (level <= (await this.getNotifiedLevel(key))) return;

    await this.setNotifiedLevel(key, level);
    const payload = buildMoveAlertPayload(scope, percentChange, this.config.thresholdPercent, symbol);
    logger.log({ level: 'info', label: LABEL, message: `MOVE ALERT — ${payload.message}` });
    void dispatchMoveAlert(payload);
  }

  // Compare each holding against the oldest sample still inside the spike window.
  // Samples are scoped to an ET date so the overnight reset of the day-change
  // baseline can't read as a spike at the next open.
  private checkSpikes(holdings: HoldingMovement[], observations: Observations): MoveAlertPayload[] {
    const { spikePercent, spikeWindowMinutes } = this.config;
    if (spikePercent <= 0 || spikeWindowMinutes <= 0) return [];

    const now = Date.now();
    const windowMs = spikeWindowMinutes * 60 * 1000;
    const { dateStr } = etDateAndMinutes();
    const fired: MoveAlertPayload[] = [];

    for (const holding of holdings) {
      const existing = observations[holding.symbol];
      const track: SymbolTrack =
        existing && existing.d === dateStr ? existing : { d: dateStr, pts: [], cd: 0 };

      track.pts = track.pts.filter(([t]) => now - t <= windowMs);
      track.pts.push([now, holding.percentChange]);
      observations[holding.symbol] = track;

      if (track.pts.length < 2) continue;
      if (now - track.cd < windowMs) continue;

      const [, oldestPercent] = track.pts[0];
      const windowChange = +(holding.percentChange - oldestPercent).toFixed(2);
      if (Math.abs(windowChange) < spikePercent) continue;

      track.cd = now;
      // Restart the window from here so the same run isn't re-reported as the
      // buffer refills.
      track.pts = [[now, holding.percentChange]];
      fired.push(
        buildSpikeAlertPayload(
          holding.symbol,
          windowChange,
          spikeWindowMinutes,
          holding.percentChange,
          spikePercent
        )
      );
    }

    return fired;
  }

  private async loadObservations(): Promise<Observations> {
    try {
      const raw = await getJobState(OBSERVATIONS_KEY);
      return raw ? (JSON.parse(raw) as Observations) : {};
    } catch {
      return {};
    }
  }

  private async saveObservations(observations: Observations): Promise<void> {
    try {
      await setJobState(OBSERVATIONS_KEY, JSON.stringify(observations));
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: `Failed to persist observations: ${err.message}` });
    }
  }

  async runCheck(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const scope = this.evalScope();
      if (!scope.stocks && !scope.crypto) return;

      const recap = await buildDailyRecap();
      const eligible = recap.holdings.filter((h) => (h.type === 'crypto' ? scope.crypto : scope.stocks));

      // The portfolio total is priced off the equity session's previous close, so
      // it is only meaningful while stocks are in scope.
      if (scope.stocks) {
        await this.checkThreshold('portfolio', recap.totalDayGLPercent);
      }

      for (const holding of eligible) {
        await this.checkThreshold('holding', holding.percentChange, holding.symbol);
      }

      const observations = await this.loadObservations();
      const spikes = this.checkSpikes(eligible, observations);
      await this.saveObservations(observations);

      for (const payload of spikes) {
        logger.log({ level: 'info', label: LABEL, message: `SPIKE ALERT — ${payload.message}` });
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

    const escalation =
      config.escalationStepPercent > 0 ? `escalating every ${config.escalationStepPercent}%` : 'once per day';
    const spike = config.spikePercent > 0 ? `${config.spikePercent}%/${config.spikeWindowMinutes}m` : 'off';
    logger.log({
      level: 'info',
      label: LABEL,
      message: `Started — interval: ${config.intervalMinutes} min, threshold: ${config.thresholdPercent}% (${escalation}), spike: ${spike}, crypto 24/7: ${config.cryptoAlwaysOn}, after hours: ${config.includeAfterHours}`,
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
