import { MarketStatusController } from './MarketStatusController';
import { PersistentInterval } from '../utils/PersistentInterval';
import { logger } from '../utils/winston';

const LABEL = 'MarketStatusService';

// Keeps the market-status cache warm on a fixed cadence, shorter than
// MarketStatusController's 1-minute TTL, so MarketStatusChip's own 60s poll
// (and any other caller) always finds a fresh cached value instead of racing
// a live Finnhub call on the request path.
const REFRESH_MS = 45_000;

class MarketStatusService {
  private readonly scheduler = new PersistentInterval('market_status_refresh');
  private readonly controller = new MarketStatusController();

  private refresh = async (): Promise<void> => {
    try {
      await this.controller.getStatus();
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: LABEL });
    }
  };

  start(): void {
    void this.scheduler.start(REFRESH_MS, this.refresh);
    logger.log({ level: 'info', message: `Started — interval: ${REFRESH_MS / 1000}s`, label: LABEL });
  }

  stop(): void {
    this.scheduler.stop();
  }
}

export const marketStatusService = new MarketStatusService();
