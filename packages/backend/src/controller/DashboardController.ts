import moment from 'moment';
import { LiveQuoteController } from '../controller/LiveQuoteController';
import { LiveRecommendationController } from '../controller/LiveRecommendationController';
import { HoldingsModel } from '../models/HoldingsModel';
import { PortfolioSnapshotDBModel } from '../models/PortfolioSnapshotModel';
import { IPriceStoreModel } from '../models/PriceStoreModel';
import { IRecommendationModel } from '../models/RecommendationModel';
import { logger } from '../utils/winston';

type HoldingAggregate = {
  accountId: string;
  name: string;
  symbol: string;
  qty: number;
  averagePrice: number;
  type: 'stock' | 'crypto';
  currentPrice: number;
  priceDate: string;
  percentChange: number;
  dayHigh: number;
  dayLow: number;
  originalValue: number;
  totalGL: number;
  totalGLPercent: number;
  marketValue: number;
  buy: number;
  hold: number;
  sell: number;
  strongBuy: number;
  strongSell: number;
};

export const createDashboard = async (): Promise<Array<HoldingAggregate>> => {
  const holdingsModel = await HoldingsModel().initialize();
  const allHoldings = holdingsModel.getAllRecords();
  const quoteController = new LiveQuoteController();
  const recommendationController = new LiveRecommendationController();

  // Collect unique symbols, preserving the isCrypto flag per symbol.
  const symbolMeta = new Map<string, boolean>(); // symbol -> isCrypto
  for (const holding of allHoldings) {
    if (!symbolMeta.has(holding.symbol)) {
      symbolMeta.set(holding.symbol, holding.type === 'crypto');
    }
  }
  const uniqueSymbols = [...symbolMeta.keys()];

  // Fetch all quotes and recommendations in parallel across unique symbols.
  // Errors are caught per-symbol so one failure doesn't abort the rest.
  const [quotes, recommendations] = await Promise.all([
    Promise.all(
      uniqueSymbols.map((sym) =>
        quoteController
          .getLiveQuote(sym, symbolMeta.get(sym))
          .catch((e: unknown): Error => (e instanceof Error ? e : new Error(String(e))))
      )
    ) as Promise<Array<IPriceStoreModel | Error>>,
    Promise.all(
      uniqueSymbols.map((sym) =>
        recommendationController
          .getLiveRecommendation(sym)
          .catch((e: unknown): Error => (e instanceof Error ? e : new Error(String(e))))
      )
    ) as Promise<Array<IRecommendationModel | Error>>,
  ]);

  const quoteMap = new Map(uniqueSymbols.map((sym, i) => [sym, quotes[i]]));
  const recMap = new Map(uniqueSymbols.map((sym, i) => [sym, recommendations[i]]));

  const result: Array<HoldingAggregate> = [];

  for (const holding of allHoldings) {
    const livePrice = quoteMap.get(holding.symbol);
    const recommendation = recMap.get(holding.symbol);

    // Only a missing price drops a holding from the total. A failed recommendation
    // (optional analyst metadata) must never remove the holding from the value.
    if (!livePrice || livePrice instanceof Error) {
      continue;
    }

    const validRec = recommendation && !(recommendation instanceof Error) ? recommendation : undefined;
    const currentValue = holding.qty * livePrice.price;
    const originalValue = holding.qty * holding.averagePrice;
    const totalGL = +(currentValue - originalValue).toFixed(2);

    result.push({
      ...holding,
      currentPrice: +livePrice.price.toFixed(2),
      priceDate: moment(livePrice.priceDate).format('lll'),
      percentChange: +livePrice.percentChange.toFixed(2),
      dayHigh: livePrice.dayHigh,
      dayLow: livePrice.dayLow,
      originalValue,
      totalGL,
      totalGLPercent: +((totalGL / originalValue) * 100).toFixed(2),
      marketValue: +(holding.qty * livePrice.price).toFixed(2),
      ...(validRec && {
        buy: validRec.buy,
        hold: validRec.hold,
        sell: validRec.sell,
        strongBuy: validRec.strongBuy,
        strongSell: validRec.strongSell,
      }),
    } as any);
  }

  // Save today's portfolio snapshot (idempotent — skips if already recorded).
  // Only record once every holding was successfully priced; a partial total
  // (some holdings dropped due to a failed live fetch) would otherwise be frozen
  // in as today's snapshot and corrupt the performance chart.
  try {
    if (allHoldings.length > 0) {
      const now = moment();
      const today = now.format('YYYY-MM-DD');
      // Value every holding, not just the ones that priced cleanly. A holding
      // that can't be priced falls back to its cost basis so a single
      // unpriceable symbol doesn't freeze the whole performance history.
      const totalValue = +allHoldings
        .reduce((sum, h) => {
          const quote = quoteMap.get(h.symbol);
          const price = quote && !(quote instanceof Error) ? quote.price : h.averagePrice;
          return sum + h.qty * price;
        }, 0)
        .toFixed(2);
      const snapshotModel = await PortfolioSnapshotDBModel().initialize();
      // Fallback daily point for when the 30-minute service isn't running.
      // Skip if any snapshot already exists for today so we don't duplicate
      // the intraday points the background service records.
      const hasToday = snapshotModel.getAllRecords().some((s) => s.date === today);
      if (!hasToday) {
        const timestamp = now.toISOString();
        await snapshotModel.insertOne({ timestamp, date: today, totalValue }, timestamp);
      }
    }
  } catch (err: any) {
    // snapshot errors must never break the dashboard response
    logger.log({
      level: 'error',
      label: 'DashboardController',
      message: `Failed to record daily portfolio snapshot: ${err.message}`,
    });
  }

  return result;
};
