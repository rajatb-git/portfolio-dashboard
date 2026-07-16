import moment from 'moment';
import { EarningsCalendarEntry, getBulkEarningsCalendar } from '../externalApis/finnHub';
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

  if (nameBySymbol.size === 0) {
    await cacheModel.insertOrUpdate({ key: CACHE_KEY, value: JSON.stringify([]) }, CACHE_KEY);
    return [];
  }

  // Earnings are quarterly; a single bulk request covering the next four months
  // captures the next report for every holding without fanning out per symbol.
  const from = today.format('YYYY-MM-DD');
  const to = moment(today).add(4, 'M').format('YYYY-MM-DD');

  let calendar: EarningsCalendarEntry[];
  try {
    calendar = await getBulkEarningsCalendar(from, to);
  } catch (err: any) {
    logger.log({ level: 'error', message: err.message, label: 'Holdings earnings calendar' });
    // Don't overwrite the cache with an empty result on a transient failure —
    // serve the last good calendar if we have one, otherwise surface the error.
    if (cached) {
      try {
        return JSON.parse(cached.value);
      } catch {
        // fall through to rethrow
      }
    }
    throw err;
  }

  // Keep only the earliest upcoming report per held symbol.
  const earliestBySymbol = new Map<string, EarningsCalendarEntry>();
  for (const entry of calendar) {
    if (!entry?.symbol || !entry.date) continue;
    const sym = entry.symbol.toUpperCase();
    if (!nameBySymbol.has(sym)) continue;
    if (moment(entry.date).startOf('day').isBefore(today)) continue;
    const existing = earliestBySymbol.get(sym);
    if (!existing || entry.date < existing.date) earliestBySymbol.set(sym, entry);
  }

  const results: HoldingEarning[] = [...earliestBySymbol.entries()].map(([symbol, entry]) => ({
    symbol,
    name: nameBySymbol.get(symbol) as string,
    date: entry.date,
    hour: entry.hour ?? null,
    epsEstimate: entry.epsEstimate ?? null,
    revenueEstimate: entry.revenueEstimate ?? null,
    daysAway: moment(entry.date).startOf('day').diff(today, 'days'),
  }));

  results.sort((a, b) => a.date.localeCompare(b.date));
  await cacheModel.insertOrUpdate({ key: CACHE_KEY, value: JSON.stringify(results) }, CACHE_KEY);
  return results;
};
