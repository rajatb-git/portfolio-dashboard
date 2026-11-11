import moment from 'moment';
import { getCachedQuotes, getCachedRecommendation } from '../marketData/quotes';
import { HoldingsModel } from '../models/HoldingsModel';
import { PortfolioSnapshotDBModel } from '../models/PortfolioSnapshotModel';
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

  // Everything here is read from the market data store and never waits on
  // Finnhub: the scheduler keeps held symbols fresh, and a symbol with nothing
  // stored yet comes back pending and is fetched within seconds.
  const quotes = await getCachedQuotes(allHoldings.map((h) => ({ symbol: h.symbol, isCrypto: h.type === 'crypto' })));
  const stockSymbols = [
    ...new Set(allHoldings.filter((h) => h.type !== 'crypto' && h.symbol).map((h) => h.symbol.toUpperCase())),
  ];
  const recommendations = new Map(
    await Promise.all(stockSymbols.map(async (sym) => [sym, (await getCachedRecommendation(sym)).value] as const))
  );

  const result: Array<HoldingAggregate> = [];

  for (const holding of allHoldings) {
    const quote = quotes.get(holding.symbol?.toUpperCase());
    const livePrice = quote?.value;
    const validRec = recommendations.get(holding.symbol?.toUpperCase()) ?? undefined;

    // A holding with no quote stays in the list at cost basis, flagged so the UI
    // can say so, rather than silently vanishing from the totals. `pricePending`
    // means the first quote is on its way; otherwise the symbol can't be priced.
    if (!livePrice) {
      const originalValue = holding.qty * holding.averagePrice;
      result.push({
        ...holding,
        priceUnavailable: true,
        pricePending: !!quote?.pending,
        currentPrice: +holding.averagePrice.toFixed(2),
        percentChange: 0,
        originalValue,
        totalGL: 0,
        totalGLPercent: 0,
        marketValue: +originalValue.toFixed(2),
      } as any);
      continue;
    }

    const currentValue = holding.qty * livePrice.price;
    const originalValue = holding.qty * holding.averagePrice;
    const totalGL = +(currentValue - originalValue).toFixed(2);

    result.push({
      ...holding,
      currentPrice: +livePrice.price.toFixed(2),
      priceDate: moment(livePrice.priceDate).toISOString(),
      percentChange: +livePrice.percentChange.toFixed(2),
      dayHigh: livePrice.dayHigh,
      dayLow: livePrice.dayLow,
      originalValue,
      totalGL,
      totalGLPercent: originalValue ? +((totalGL / originalValue) * 100).toFixed(2) : 0,
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
  // Wait while any first quote is still on its way: a total with those at cost
  // basis would be frozen in as today's point on the performance chart.
  try {
    if (allHoldings.length > 0 && !result.some((r: any) => r.pricePending)) {
      const now = moment();
      const today = now.format('YYYY-MM-DD');
      // Value every holding, not just the ones that priced cleanly. A holding
      // that can't be priced falls back to its cost basis so a single
      // unpriceable symbol doesn't freeze the whole performance history.
      const totalValue = +allHoldings
        .reduce((sum, h) => {
          const price = quotes.get(h.symbol?.toUpperCase())?.value?.price ?? h.averagePrice;
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
