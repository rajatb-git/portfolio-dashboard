// US equity market (NYSE/Nasdaq) calendar: regular hours, full-closure holidays,
// and early-close half days. Used to gate background polling so we never hit the
// network for stock quotes on weekends, holidays, or outside trading hours.
// Crypto trades 24/7 and is NOT gated by this calendar.

const MARKET_OPEN_MIN = 9 * 60 + 30; // 9:30 ET
const REGULAR_CLOSE_MIN = 16 * 60; // 16:00 ET
const EARLY_CLOSE_MIN = 13 * 60; // 13:00 ET (half days)

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

// nth (1-based) weekday (0=Sun..6=Sat) of a month.
function nthWeekday(year: number, month1: number, weekday: number, n: number): string {
  const first = new Date(Date.UTC(year, month1 - 1, 1)).getUTCDay();
  const day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  return ymd(year, month1, day);
}

function lastWeekday(year: number, month1: number, weekday: number): string {
  const lastDay = new Date(Date.UTC(year, month1, 0)).getUTCDate();
  const lastDow = new Date(Date.UTC(year, month1 - 1, lastDay)).getUTCDay();
  const day = lastDay - ((lastDow - weekday + 7) % 7);
  return ymd(year, month1, day);
}

// Anonymous Gregorian (Meeus/Jones/Butcher) algorithm for Easter Sunday.
function easter(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

// Shift a fixed-date holiday to its observed trading day: Sat -> Fri, Sun -> Mon.
function observed(year: number, month1: number, day: number): string {
  const dow = new Date(Date.UTC(year, month1 - 1, day)).getUTCDay();
  let offset = 0;
  if (dow === 6) offset = -1;
  else if (dow === 0) offset = 1;
  const dt = new Date(Date.UTC(year, month1 - 1, day + offset));
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

const holidayCache = new Map<number, Set<string>>();
const halfDayCache = new Map<number, Set<string>>();

function fullCloseHolidays(year: number): Set<string> {
  let cached = holidayCache.get(year);
  if (cached) return cached;

  const e = easter(year);
  const easterStr = ymd(year, e.month, e.day);
  cached = new Set<string>([
    observed(year, 1, 1), // New Year's Day
    nthWeekday(year, 1, 1, 3), // MLK Jr. Day (3rd Mon Jan)
    nthWeekday(year, 2, 1, 3), // Washington's Birthday (3rd Mon Feb)
    addDays(easterStr, -2), // Good Friday
    lastWeekday(year, 5, 1), // Memorial Day (last Mon May)
    observed(year, 6, 19), // Juneteenth
    observed(year, 7, 4), // Independence Day
    nthWeekday(year, 9, 1, 1), // Labor Day (1st Mon Sep)
    nthWeekday(year, 11, 4, 4), // Thanksgiving (4th Thu Nov)
    observed(year, 12, 25), // Christmas
  ]);
  holidayCache.set(year, cached);
  return cached;
}

// Best-effort 1:00 PM early closes: day after Thanksgiving, and the weekday
// before Independence Day / Christmas when those are trading days.
function halfDays(year: number): Set<string> {
  let cached = halfDayCache.get(year);
  if (cached) return cached;

  const holidays = fullCloseHolidays(year);
  const candidates = new Set<string>();
  candidates.add(addDays(nthWeekday(year, 11, 4, 4), 1)); // Black Friday

  const isTradingWeekday = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return dow !== 0 && dow !== 6 && !holidays.has(s);
  };

  const july3 = ymd(year, 7, 3);
  if (isTradingWeekday(july3)) candidates.add(july3);
  const dec24 = ymd(year, 12, 24);
  if (isTradingWeekday(dec24)) candidates.add(dec24);

  cached = new Set([...candidates].filter(isTradingWeekday));
  halfDayCache.set(year, cached);
  return cached;
}

// Convert "now" to wall-clock time in America/New_York (handles EST/EDT).
function etParts(now: Date): { dateStr: string; minutes: number; day: number } {
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return {
    dateStr: ymd(et.getFullYear(), et.getMonth() + 1, et.getDate()),
    minutes: et.getHours() * 60 + et.getMinutes(),
    day: et.getDay(),
  };
}

export function isMarketHoliday(now: Date = new Date()): boolean {
  const { dateStr } = etParts(now);
  const year = Number(dateStr.slice(0, 4));
  return fullCloseHolidays(year).has(dateStr);
}

// True only during regular US equity trading hours on a real trading day.
export function isStockMarketOpen(now: Date = new Date()): boolean {
  const { dateStr, minutes, day } = etParts(now);
  if (day === 0 || day === 6) return false;
  const year = Number(dateStr.slice(0, 4));
  if (fullCloseHolidays(year).has(dateStr)) return false;
  const close = halfDays(year).has(dateStr) ? EARLY_CLOSE_MIN : REGULAR_CLOSE_MIN;
  return minutes >= MARKET_OPEN_MIN && minutes < close;
}

// A real trading day in ET (weekday, not a full-close holiday). Unlike
// isStockMarketOpen this ignores the time of day — true all day on a trading day.
export function isTradingDay(now: Date = new Date()): boolean {
  const { dateStr, day } = etParts(now);
  if (day === 0 || day === 6) return false;
  const year = Number(dateStr.slice(0, 4));
  return !fullCloseHolidays(year).has(dateStr);
}

// Minutes-since-ET-midnight at which the market closes today (early on half days).
// Only meaningful on a trading day — callers should gate with isTradingDay first.
export function getMarketCloseMinutes(now: Date = new Date()): number {
  const { dateStr } = etParts(now);
  const year = Number(dateStr.slice(0, 4));
  return halfDays(year).has(dateStr) ? EARLY_CLOSE_MIN : REGULAR_CLOSE_MIN;
}

// "now" as ET wall-clock date string and minutes-since-midnight, for schedulers.
export function etDateAndMinutes(now: Date = new Date()): { dateStr: string; minutes: number } {
  const { dateStr, minutes } = etParts(now);
  return { dateStr, minutes };
}
