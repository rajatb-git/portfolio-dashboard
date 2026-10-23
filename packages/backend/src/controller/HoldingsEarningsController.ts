import moment from 'moment';
import type { EarningsCalendarEntry } from '../externalApis/finnHub';
import { EARNINGS_LOOKBACK_DAYS } from '../marketData/datasets';
import { read } from '../marketData/store';
import { HoldingsModel } from '../models/HoldingsModel';
import { etDateAndMinutes } from '../utils/marketCalendar';

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

// The countdowns are derived per read, never stored, so a snapshot can't hand
// out a distance measured from the day it was built.
type CachedEarning = Omit<HoldingEarning, 'daysAway'>;
type CachedResult = Omit<HoldingEarningResult, 'daysAgo'>;
type CalendarSnapshot = { upcoming: CachedEarning[]; reported: CachedResult[] };

// Reports land in the window the moment their date passes and gain their actual
// numbers hours later, which is what turns a release into a result.
const REPORTED_LOOKBACK_DAYS = EARNINGS_LOOKBACK_DAYS;

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

// Each held stock's releases are stored per symbol and kept fresh by the
// market data scheduler. A job that must not miss a symbol (the reminders) waits
// for any that haven't been fetched yet; a page just shows what is there.
const getSnapshot = async (
  options: { waitForPendingMs?: number } = {}
): Promise<{ snapshot: CalendarSnapshot; today: string }> => {
  // The market's day, not the server's: a UTC-hosted backend rolls over at 20:00
  // ET and would drop a report still due that afternoon.
  const today = etDateAndMinutes().dateStr;

  const holdingsModel = await HoldingsModel().initialize();
  const nameBySymbol = new Map<string, string>();
  for (const h of holdingsModel.getAllRecords()) {
    if (h.type === 'stock' && h.symbol) {
      const sym = h.symbol.toUpperCase();
      if (!nameBySymbol.has(sym)) nameBySymbol.set(sym, h.name);
    }
  }

  const perSymbol = await Promise.all(
    [...nameBySymbol.keys()].map(async (symbol) => {
      let result = await read<EarningsCalendarEntry[]>('earnings', symbol);
      if (result.pending && options.waitForPendingMs) {
        result = await read<EarningsCalendarEntry[]>('earnings', symbol, {
          mode: 'fresh',
          lane: 'background',
          waitMs: options.waitForPendingMs,
        });
      }
      return (result.value ?? []).map((entry) => ({ ...entry, symbol }));
    })
  );

  return { snapshot: bucketReleases(perSymbol.flat(), nameBySymbol, today), today };
};

export const getHoldingsEarningsCalendar = async (
  options: { waitForPendingMs?: number } = {}
): Promise<HoldingEarning[]> => {
  const { snapshot, today } = await getSnapshot(options);
  return upcomingFrom(snapshot.upcoming, today);
};

// Reports from held symbols that have published their numbers, newest first.
export const getHoldingsEarningsResults = async (
  options: { waitForPendingMs?: number } = {}
): Promise<HoldingEarningResult[]> => {
  const { snapshot, today } = await getSnapshot(options);
  return reportedFrom(snapshot.reported, today);
};
