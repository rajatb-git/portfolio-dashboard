import moment from 'moment';
import { EarningsCalendarEntry, getBulkEarningsCalendar, getSymbolEarningsCalendar } from '../externalApis/finnHub';
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

export type HoldingEarningResult = {
  symbol: string;
  name: string;
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  surprisePercent: number | null;
  daysAgo: number;
};

// What the cache holds: the countdowns are derived per read, never stored, so a
// cached calendar can't hand out a distance measured from the day it was written.
type CachedEarning = Omit<HoldingEarning, 'daysAway'>;
type CachedResult = Omit<HoldingEarningResult, 'daysAgo'>;
type CalendarSnapshot = { upcoming: CachedEarning[]; reported: CachedResult[] };

const CACHE_KEY = 'holdings_earnings_calendar';
const CACHE_HOURS = 6;
// A failed refresh falls back to the cached calendar, but not forever: past this
// the dates are old enough that serving them would silently freeze the dashboard
// and the earnings reminders on a quarter that has already reported.
const STALE_FALLBACK_HOURS = 24;
// How far back the window reaches. Reports land in it the moment their date
// passes and gain their actual numbers hours later, which is what turns a
// release into a result.
const REPORTED_LOOKBACK_DAYS = 14;
// Earnings are quarterly, so four months ahead covers every holding's next report.
const UPCOMING_HORIZON_MONTHS = 4;

const surpriseOf = (actual: number | null, estimate: number | null): number | null =>
  actual === null || estimate === null || estimate === 0 ? null : ((actual - estimate) / Math.abs(estimate)) * 100;

const daysBetween = (from: string, to: string): number =>
  moment(to, 'YYYY-MM-DD').diff(moment(from, 'YYYY-MM-DD'), 'days');

const upcomingFrom = (entries: CachedEarning[], today: string): HoldingEarning[] =>
  entries
    .filter((entry) => entry?.date && entry.date >= today)
    .map((entry) => ({ ...entry, daysAway: daysBetween(today, entry.date) }))
    .sort((a, b) => a.date.localeCompare(b.date));

const reportedFrom = (entries: CachedResult[], today: string): HoldingEarningResult[] =>
  entries
    .filter((entry) => entry?.date && entry.date <= today && daysBetween(entry.date, today) <= REPORTED_LOOKBACK_DAYS)
    .map((entry) => ({ ...entry, daysAgo: daysBetween(entry.date, today) }))
    .sort((a, b) => b.date.localeCompare(a.date));

// Split one pool of releases into the next report per held symbol and the most
// recent published result per held symbol. A release counts as reported once it
// carries an actual EPS, so a report that has passed but has not published its
// numbers yet stays out of both lists rather than showing as a result with no
// figures.
const bucketReleases = (
  releases: EarningsCalendarEntry[],
  nameBySymbol: Map<string, string>,
  today: string
): CalendarSnapshot => {
  const nextBySymbol = new Map<string, EarningsCalendarEntry>();
  const lastBySymbol = new Map<string, EarningsCalendarEntry>();

  for (const entry of releases) {
    if (!entry?.symbol || !entry.date) continue;
    const sym = entry.symbol.toUpperCase();
    if (!nameBySymbol.has(sym)) continue;

    if (entry.epsActual != null && entry.date <= today) {
      const latest = lastBySymbol.get(sym);
      if (!latest || entry.date > latest.date) lastBySymbol.set(sym, entry);
    } else if (entry.date >= today) {
      const earliest = nextBySymbol.get(sym);
      if (!earliest || entry.date < earliest.date) nextBySymbol.set(sym, entry);
    }
  }

  return {
    upcoming: [...nextBySymbol.entries()].map(([symbol, entry]) => ({
      symbol,
      name: nameBySymbol.get(symbol) as string,
      date: entry.date,
      hour: entry.hour ?? null,
      epsEstimate: entry.epsEstimate ?? null,
      revenueEstimate: entry.revenueEstimate ?? null,
    })),
    reported: [...lastBySymbol.entries()].map(([symbol, entry]) => ({
      symbol,
      name: nameBySymbol.get(symbol) as string,
      date: entry.date,
      epsActual: entry.epsActual ?? null,
      epsEstimate: entry.epsEstimate ?? null,
      revenueActual: entry.revenueActual ?? null,
      revenueEstimate: entry.revenueEstimate ?? null,
      surprisePercent: surpriseOf(entry.epsActual ?? null, entry.epsEstimate ?? null),
    })),
  };
};

// One request covering every holding at once.
const bulkSnapshot = async (
  nameBySymbol: Map<string, string>,
  from: string,
  to: string,
  today: string
): Promise<CalendarSnapshot> => bucketReleases(await getBulkEarningsCalendar(from, to), nameBySymbol, today);

// One request per held symbol — the shape this used before the bulk call, kept
// as a fallback because the unfiltered calendar is not served on every Finnhub
// plan. Without it a plan that rejects the bulk request leaves the calendar
// pinned to whatever was cached last, which silently stops every earnings
// reminder. A symbol that fails is skipped; only a total wipeout is an error.
const perSymbolSnapshot = async (
  nameBySymbol: Map<string, string>,
  from: string,
  to: string,
  today: string
): Promise<CalendarSnapshot> => {
  const releases: EarningsCalendarEntry[] = [];
  let failed = 0;

  await Promise.all(
    [...nameBySymbol.keys()].map(async (symbol) => {
      try {
        releases.push(...(await getSymbolEarningsCalendar(symbol, from, to)));
      } catch {
        failed += 1;
      }
    })
  );

  if (failed === nameBySymbol.size) throw new Error('Earnings calendar lookups failed for every holding');
  return bucketReleases(releases, nameBySymbol, today);
};

const getSnapshot = async (): Promise<{ snapshot: CalendarSnapshot; today: string }> => {
  // The market's day, not the server's: a UTC-hosted backend rolls over at 20:00
  // ET and would drop a report still due that afternoon, skipping its reminder
  // and jumping the dashboard to the next quarter.
  const today = etDateAndMinutes().dateStr;

  const cacheModel = await CacheDBModel().initialize();
  const cached = cacheModel.findById(CACHE_KEY);
  const cachedAgeHours = cached ? moment().diff(moment(cached.updatedAt), 'hours') : Number.POSITIVE_INFINITY;
  const readCache = (): CalendarSnapshot | null => {
    try {
      const parsed = JSON.parse(cached?.value ?? '');
      return Array.isArray(parsed?.upcoming) && Array.isArray(parsed?.reported) ? parsed : null;
    } catch {
      return null;
    }
  };

  if (cached && cachedAgeHours < CACHE_HOURS) {
    const fresh = readCache();
    if (fresh) return { snapshot: fresh, today };
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

  const empty: CalendarSnapshot = { upcoming: [], reported: [] };
  if (nameBySymbol.size === 0) {
    await cacheModel.insertOrUpdate({ key: CACHE_KEY, value: JSON.stringify(empty) }, CACHE_KEY);
    return { snapshot: empty, today };
  }

  const from = moment(today, 'YYYY-MM-DD').subtract(REPORTED_LOOKBACK_DAYS, 'd').format('YYYY-MM-DD');
  const to = moment(today, 'YYYY-MM-DD').add(UPCOMING_HORIZON_MONTHS, 'M').format('YYYY-MM-DD');

  let snapshot: CalendarSnapshot;
  try {
    snapshot = await bulkSnapshot(nameBySymbol, from, to, today);
    // A stock portfolio always has something reporting inside four months, so an
    // empty result means the request was answered but not served — treat it like
    // a failure rather than caching "nothing reports" for six hours.
    if (snapshot.upcoming.length === 0) throw new Error('bulk calendar returned no reports for any holding');
  } catch (bulkErr: any) {
    logger.log({
      level: 'warn',
      message: `Bulk earnings calendar failed (${bulkErr.message}) — falling back to per-symbol lookups`,
      label: 'Holdings earnings calendar',
    });
    try {
      snapshot = await perSymbolSnapshot(nameBySymbol, from, to, today);
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Holdings earnings calendar' });
      // Don't overwrite the cache with an empty result on a transient failure —
      // serve the last good calendar if it is still recent enough to be true.
      const stale = cachedAgeHours < STALE_FALLBACK_HOURS ? readCache() : null;
      if (stale) return { snapshot: stale, today };
      throw err;
    }
  }

  await cacheModel.insertOrUpdate({ key: CACHE_KEY, value: JSON.stringify(snapshot) }, CACHE_KEY);
  return { snapshot, today };
};

export const getHoldingsEarningsCalendar = async (): Promise<HoldingEarning[]> => {
  const { snapshot, today } = await getSnapshot();
  return upcomingFrom(snapshot.upcoming, today);
};

// Reports from held symbols that have published their numbers, newest first.
export const getHoldingsEarningsResults = async (): Promise<HoldingEarningResult[]> => {
  const { snapshot, today } = await getSnapshot();
  return reportedFrom(snapshot.reported, today);
};
