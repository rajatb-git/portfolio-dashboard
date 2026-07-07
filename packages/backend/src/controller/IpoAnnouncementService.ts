import {
  DEFAULT_IPO_ANNOUNCEMENT_CONFIG,
  getIpoAnnouncementConfig,
  type IIpoAnnouncementConfig,
} from '../models/IpoAnnouncementConfigModel';
import { AnnouncedIPODBModel } from '../models/AnnouncedIPOModel';
import { getJobState, setJobState } from '../models/JobRunStateModel';
import type { IIPO } from '../models/IPOModel';
import { PersistentInterval } from '../utils/PersistentInterval';
import { logger } from '../utils/winston';
import { buildIpoAnnouncementPayload, dispatchIpoAnnouncement } from './NotificationDispatcher';
import { mqttPublisher } from './MqttPublisher';
import { IPOController } from './IPOController';

const LABEL = 'IpoAnnouncementService';

// The IPO calendar changes at day granularity and IPOController caches the
// upstream fetch for ~24h, so a frequent poll would only re-read the cache.
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

// Set once the initial calendar has been recorded as the baseline, so enabling
// the feature on an existing calendar doesn't blast an announcement for every
// entry already listed — only genuinely new future entries are announced.
const SEEDED_KEY = 'ipo_announcement:seeded';

class IpoAnnouncementService {
  private readonly scheduler = new PersistentInterval('ipo_announcement');
  private readonly ipoController = new IPOController();
  private config: IIpoAnnouncementConfig = DEFAULT_IPO_ANNOUNCEMENT_CONFIG;
  private running = false;

  async runCheck(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const ipos = await this.ipoController.getIPOs();
      if (ipos instanceof Error) {
        logger.log({ level: 'error', label: LABEL, message: `Failed to load IPO calendar: ${ipos.message}` });
        return;
      }

      const announcedModel = await AnnouncedIPODBModel().initialize();
      const seen = new Set(announcedModel.getAllRecords().map((rec) => rec.symbol));

      const seeded = (await getJobState(SEEDED_KEY)) === 'true';
      if (!seeded) {
        for (const ipo of ipos) {
          if (seen.has(ipo.symbol)) continue;
          await this.recordAnnounced(ipo);
        }
        await setJobState(SEEDED_KEY, 'true');
        logger.log({ level: 'info', label: LABEL, message: `Seeded baseline with ${ipos.length} IPO(s)` });
        return;
      }

      for (const ipo of ipos) {
        if (seen.has(ipo.symbol)) continue;
        await this.recordAnnounced(ipo);
        const payload = buildIpoAnnouncementPayload(ipo);
        logger.log({ level: 'info', label: LABEL, message: `NEW IPO — ${payload.message}` });
        void dispatchIpoAnnouncement(payload, this.config.topic);
      }
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: err.message });
    } finally {
      this.running = false;
    }
  }

  private async recordAnnounced(ipo: IIPO): Promise<void> {
    const announcedModel = await AnnouncedIPODBModel().initialize();
    await announcedModel.insertOrUpdate(
      { symbol: ipo.symbol, name: ipo.name, date: ipo.date, announcedAt: new Date().toISOString() },
      ipo.symbol
    );
  }

  // Publish a sample announcement immediately, bypassing the schedule and the
  // seen-set, so the Settings page can offer a "Send now" test.
  async sendTest(): Promise<{ ok: boolean; mqttEnabled: boolean }> {
    const config = await getIpoAnnouncementConfig();
    const sample: IIPO = {
      symbol: 'TEST',
      name: 'Test Company Inc.',
      date: new Date().toISOString().slice(0, 10),
      exchange: 'NASDAQ',
      numberOfShares: 1_000_000,
      price: '18.00-20.00',
      status: 'expected',
      totalSharesValue: 20_000_000,
    };
    const ok = await dispatchIpoAnnouncement(buildIpoAnnouncementPayload(sample), config.topic);
    return { ok, mqttEnabled: mqttPublisher.isEnabled() };
  }

  start(config: IIpoAnnouncementConfig): void {
    this.stop();
    this.config = config;
    if (!config.enabled) {
      logger.log({ level: 'info', label: LABEL, message: 'Disabled' });
      return;
    }

    void this.scheduler.start(CHECK_INTERVAL_MS, () => this.runCheck());
    logger.log({ level: 'info', label: LABEL, message: `Started — publishing new IPOs to ${config.topic}` });
  }

  stop(): void {
    this.scheduler.stop();
    logger.log({ level: 'info', label: LABEL, message: 'Stopped' });
  }

  reconfigure(config: IIpoAnnouncementConfig): void {
    this.start(config);
  }
}

export const ipoAnnouncementService = new IpoAnnouncementService();
