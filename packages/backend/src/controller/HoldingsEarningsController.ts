import moment from 'moment';
import { getEarningsCalendar } from '../externalApis/finnHub';
import { CacheDBModel } from '../models/CacheModel';
import { HoldingsModel } from '../models/HoldingsModel';
import { logger } from '../utils/winston';

export type HoldingEarning = {
  symbol: string;
  name: string;
  date: string;
  hour: string | null;
  epsEstimate: number | null;
  revenueEstimate: number | null;
  daysAway: number;
};

const CACHE_KEY = 'holdings_earnings_calendar';
const CACHE_HOURS = 6;

export const getHoldingsEarningsCalendar = async (): Promise<HoldingEarning[]> => {
  const cacheModel = await CacheDBModel().initialize();
  const cached = cacheModel.findById(CACHE_KEY);
  if (cached && moment().diff(moment(cached.updatedAt), 'hours') < CACHE_HOURS) {
    try {
      return JSON.parse(cached.value);
    } catch {
      // stale/corrupt cache, regenerate
    }
  }

  const holdingsModel = await HoldingsModel().initialize();
  const holdings = holdingsModel.getAllRecords();

  // Earnings only apply to equities; collapse to one lookup per unique symbol.
  const nameBySymbol = new Map<string, string>();
  for (const h of holdings) {
    if (h.type === 'stock' && h.symbol) {
      const sym = h.symbol.toUpperCase();
      if (!nameBySymbol.has(sym)) nameBySymbol.set(sym, h.name);
    }
  }

  const today = moment().startOf('day');
  const results: HoldingEarning[] = [];

  await Promise.all(
    [...nameBySymbol.entries()].map(async ([symbol, name]) => {
      try {
        const earning = await getEarningsCalendar(symbol);
        if (earning?.date) {
          const date = moment(earning.date).startOf('day');
          if (date.isSameOrAfter(today)) {
            results.push({
              symbol,
              name,
              date: earning.date,
              hour: earning.hour ?? null,
              epsEstimate: earning.epsEstimate ?? null,
              revenueEstimate: earning.revenueEstimate ?? null,
              daysAway: date.diff(today, 'days'),
            });
          }
        }
      } catch (err: any) {
        logger.log({ level: 'error', message: err.message, label: `Earnings calendar "${symbol}"` });
      }
    })
  );

  results.sort((a, b) => a.date.localeCompare(b.date));
  await cacheModel.insertOrUpdate({ key: CACHE_KEY, value: JSON.stringify(results) }, CACHE_KEY);
  return results;
};
