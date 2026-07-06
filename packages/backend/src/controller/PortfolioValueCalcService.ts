import moment from 'moment';
import { HoldingsModel } from '../models/HoldingsModel';
import { PortfolioSnapshotDBModel } from '../models/PortfolioSnapshotModel';
import type { IValueCalcConfig } from '../models/ValueCalcConfigModel';
import { isStockMarketOpen } from '../utils/marketCalendar';
import { PersistentInterval } from '../utils/PersistentInterval';
import { LiveQuoteController } from './LiveQuoteController';
import { logger } from '../utils/winston';

const LABEL = 'PortfolioValueCalcService';

class PortfolioValueCalcService {
  private readonly scheduler = new PersistentInterval('portfolio_value_calc');
  private config: IValueCalcConfig = { enabled: false, intervalMinutes: 15 };

  async runCalculation(): Promise<void> {
    // Only record during real US trading hours — skips weekends, market
    // holidays, and early-close half days as well as after-hours ticks.
    if (!isStockMarketOpen()) return;

    try {
      const holdingsModel = await HoldingsModel().initialize();
      const allHoldings = holdingsModel.getAllRecords();

      if (allHoldings.length === 0) return;

      const quoteController = new LiveQuoteController();
      const symbolMeta = new Map<string, boolean>();
      for (const h of allHoldings) {
        if (!symbolMeta.has(h.symbol)) {
          symbolMeta.set(h.symbol, h.type === 'crypto');
        }
      }
      const uniqueSymbols = [...symbolMeta.keys()];

      const quotes = await Promise.all(
        uniqueSymbols.map((sym) =>
          quoteController
            .getLiveQuote(sym, symbolMeta.get(sym))
            .catch((e: unknown): Error => (e instanceof Error ? e : new Error(String(e))))
        )
      );

      const quoteMap = new Map(uniqueSymbols.map((sym, i) => [sym, quotes[i]]));

      let totalValue = 0;
      let unpricedCount = 0;

      for (const holding of allHoldings) {
        const quote = quoteMap.get(holding.symbol);
        // A holding that can't be priced this cycle falls back to its cost basis
        // rather than freezing the entire snapshot — one unpriceable symbol must
        // not stall the whole performance history.
        const price = quote && !(quote instanceof Error) ? quote.price : holding.averagePrice;
        if (!quote || quote instanceof Error) unpricedCount++;
        totalValue += holding.qty * price;
      }

      if (unpricedCount > 0) {
        logger.log({
          level: 'warn',
          message: `Snapshot recorded with ${unpricedCount} holding(s) fell back to cost basis (unpriceable)`,
          label: LABEL,
        });
      }

      const now = moment();
      const timestamp = now.toISOString();
      const snapshotModel = await PortfolioSnapshotDBModel().initialize();
      // Each run is its own data point — keyed by timestamp so intraday
      // snapshots accumulate instead of overwriting a single per-day record.
      await snapshotModel.insertOne(
        { timestamp, date: now.format('YYYY-MM-DD'), totalValue: +totalValue.toFixed(2) },
        timestamp
      );

      logger.log({ level: 'info', message: `Portfolio snapshot updated: $${totalValue.toFixed(2)}`, label: LABEL });
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: LABEL });
    }
  }

  start(config: IValueCalcConfig): void {
    this.stop();
    this.config = config;

    if (!config.enabled) return;

    const intervalMs = config.intervalMinutes * 60 * 1000;
    void this.scheduler.start(intervalMs, () => this.runCalculation());

    logger.log({ level: 'info', message: `Started — interval: ${config.intervalMinutes} min`, label: LABEL });
  }

  stop(): void {
    this.scheduler.stop();
    logger.log({ level: 'info', message: 'Stopped', label: LABEL });
  }

  reconfigure(config: IValueCalcConfig): void {
    this.start(config);
  }
}

export const portfolioValueCalcService = new PortfolioValueCalcService();
