import moment from 'moment';
import { EarningsCalendarEntry, getBulkEarningsCalendar, getEarningsCalendar } from '../externalApis/finnHub';
import { CacheDBModel } from '../models/CacheModel';
import { HoldingsModel } from '../models/HoldingsModel';
import { etDateAndMinutes } from '../utils/marketCalendar';
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

// What the cache holds: daysAway is derived per read, never stored, so a cached
// calendar can't hand out a countdown measured from the day it was written.
type CachedEarning = Omit<HoldingEarning, 'daysAway'>;

const CACHE_KEY = 'holdings_earnings_calendar';
const CACHE_HOURS = 6;
// A failed refresh falls back to the cached calendar, but not forever: past this
// the dates are old enough that serving them would silently freeze the dashboard
// and the earnings reminders on a quarter that has already reported.
const STALE_FALLBACK_HOURS = 24;

const upcomingFrom = (entries: CachedEarning[], today: string): HoldingEarning[] =>
  entries
    .filter((entry) => entry?.date && entry.date >= today)
    .map((entry) => ({
      ...entry,
      daysAway: moment(entry.date, 'YYYY-MM-DD').diff(moment(today, 'YYYY-MM-DD'), 'days'),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

// Earnings are quarterly; a single bulk request covering the next four months
// captures the next report for every holding without fanning out per symbol.
const bulkPicks = async (nameBySymbol: Map<string, string>, today: string): Promise<CachedEarning[]> => {
  const to = moment(today, 'YYYY-MM-DD').add(4, 'M').format('YYYY-MM-DD');
  const calendar: EarningsCalendarEntry[] = await getBulkEarningsCalendar(today, to);

  // Keep only the earliest upcoming report per held symbol.
  const earliestBySymbol = new Map<string, EarningsCalendarEntry>();
  for (const entry of calendar) {
    if (!entry?.symbol || !entry.date || entry.date < today) continue;
    const sym = entry.symbol.toUpperCase();
    if (!nameBySymbol.has(sym)) continue;
    const existing = earliestBySymbol.get(sym);
    if (!existing || entry.date < existing.date) earliestBySymbol.set(sym, entry);
  }

  return [...earliestBySymbol.entries()].map(([symbol, entry]) => ({
    symbol,
    name: nameBySymbol.get(symbol) as string,
    date: entry.date,
    hour: entry.hour ?? null,
    epsEstimate: entry.epsEstimate ?? null,
    revenueEstimate: entry.revenueEstimate ?? null,
  }));
};

// One request per held symbol — the shape this used before the bulk call, kept
// as a fallback because the unfiltered calendar is not served on every Finnhub
// plan. Without it a plan that rejects the bulk request leaves the calendar
// pinned to whatever was cached last, which silently stops every earnings
// reminder. A symbol that fails is skipped; only a total wipeout is an error.
const perSymbolPicks = async (nameBySymbol: Map<string, string>, today: string): Promise<CachedEarning[]> => {
  const picks: CachedEarning[] = [];
  let failed = 0;

  await Promise.all(
    [...nameBySymbol.entries()].map(async ([symbol, name]) => {
      try {
        const release = await getEarningsCalendar(symbol);
        if (release?.date && release.date >= today) {
          picks.push({
            symbol,
            name,
            date: release.date,
            hour: release.hour ?? null,
            epsEstimate: release.epsEstimate ?? null,
            revenueEstimate: release.revenueEstimate ?? null,
          });
        }
      } catch {
        failed += 1;
      }
    })
  );

  if (failed === nameBySymbol.size) throw new Error('Earnings calendar lookups failed for every holding');
  return picks;
};

export const getHoldingsEarningsCalendar = async (): Promise<HoldingEarning[]> => {
  // The market's day, not the server's: a UTC-hosted backend rolls over at 20:00
  // ET and would drop a report still due that afternoon, skipping its reminder
  // and jumping the dashboard to the next quarter.
  const today = etDateAndMinutes().dateStr;

  const cacheModel = await CacheDBModel().initialize();
  const cached = cacheModel.findById(CACHE_KEY);
  const cachedAgeHours = cached ? moment().diff(moment(cached.updatedAt), 'hours') : Number.POSITIVE_INFINITY;

  if (cached && cachedAgeHours < CACHE_HOURS) {
    try {
      return upcomingFrom(JSON.parse(cached.value), today);
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

  if (nameBySymbol.size === 0) {
    await cacheModel.insertOrUpdate({ key: CACHE_KEY, value: JSON.stringify([]) }, CACHE_KEY);
    return [];
  }

  let picks: CachedEarning[];
  try {
    picks = await bulkPicks(nameBySymbol, today);
    // A stock portfolio always has something reporting inside four months, so an
    // empty bulk result means the request was answered but not served — treat it
    // like a failure rather than caching "nothing reports" for six hours.
    if (picks.length === 0) throw new Error('bulk calendar returned no reports for any holding');
  } catch (bulkErr: any) {
    logger.log({
      level: 'warn',
      message: `Bulk earnings calendar failed (${bulkErr.message}) — falling back to per-symbol lookups`,
      label: 'Holdings earnings calendar',
    });
    try {
      picks = await perSymbolPicks(nameBySymbol, today);
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Holdings earnings calendar' });
      // Don't overwrite the cache with an empty result on a transient failure —
      // serve the last good calendar if it is still recent enough to be true.
      if (cached && cachedAgeHours < STALE_FALLBACK_HOURS) {
        try {
          return upcomingFrom(JSON.parse(cached.value), today);
        } catch {
          // fall through to rethrow
        }
      }
      throw err;
    }
  }

  await cacheModel.insertOrUpdate({ key: CACHE_KEY, value: JSON.stringify(picks) }, CACHE_KEY);
  return upcomingFrom(picks, today);
};
