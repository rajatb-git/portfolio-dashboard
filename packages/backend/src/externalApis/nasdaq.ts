import https from 'node:https';
import axios, { AxiosError } from 'axios';
import moment from 'moment';
import { QuoteResponse } from './types';
import { etDateAndMinutes, etTimestamp, isTradingDay } from '../utils/marketCalendar';
import { logger } from '../utils/winston';

type Range = '1d' | '5d' | '1M' | '3M' | '6M' | '1y' | '2y' | '3y';

// NASDAQ's API uses TLS fingerprinting (Cloudflare/Akamai) that blocks Node.js's
// default TLS profile. Custom cipher suites matching curl's profile bypass this.
const nasdaqAgent = new https.Agent({
  ciphers: [
    'TLS_AES_128_GCM_SHA256',
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
  ].join(':'),
});

const nasdaqHeaders = { 'Content-Type': 'application/json', 'User-Agent': 'PostmanRuntime/7.26.8' };

// NASDAQ's edge sometimes holds a connection open instead of refusing it. A quote
// request that never settles pins the market data store's in-flight refresh for
// that symbol, so every later refresh waits on it forever.
const QUOTE_TIMEOUT_MS = 10_000;

const parseDollarAmount = (raw: string | undefined | null): number => {
  if (!raw || raw === 'N/A') return 0;
  const num = parseFloat(raw.replace(/[$,+\s]/g, ''));
  return Number.isFinite(num) ? num : 0;
};

// Strips everything but digits, dot, and a leading minus — handles "+319.05%" and
// "-91.51%" alike.
const parsePercent = (raw: string | undefined | null): number => {
  if (!raw) return 0;
  const num = parseFloat(raw.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(num) ? num : 0;
};

export type NasdaqMover = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
};

// Movers are drawn from the screener (not /marketmovers) so we can restrict to
// real, liquid companies: mid-cap and up, priced above a floor. Without this the
// "top movers" are dominated by sub-dollar penny names with triple-digit swings.
const MOVER_MARKETCAP_TIERS = 'mega|large|mid'; // roughly ≥ $2B
const MOVER_MIN_PRICE = 5;
const MOVER_MIN_MARKETCAP = 2_000_000_000;
const MOVER_LIMIT = 10;

// NASDAQ reports two price blocks whose meaning depends on `marketStatus`:
// during "Pre-Market"/"After Hours" primaryData is the live extended-hours print
// and secondaryData is the last completed regular-session close; during the
// regular session (and once everything is closed) primaryData is the regular
// quote and secondaryData is empty. Keeping the two apart is what lets the app
// show "Tuesday's close" and "up 0.4% pre-market" as separate figures instead of
// silently overwriting one with the other.
export type ExtendedQuote = {
  price: number;
  change: number;
  percentChange: number;
  session: 'pre-market' | 'post-market';
  asOf: string;
};

export type NasdaqQuote = QuoteResponse & { extended: ExtendedQuote | null };

type PriceBlock = { lastSalePrice?: string; netChange?: string; percentageChange?: string };

const extendedSessionFor = (marketStatus: string): 'pre-market' | 'post-market' | null => {
  const status = marketStatus.toLowerCase();
  if (status.includes('pre')) return 'pre-market';
  if (status.includes('after') || status.includes('post')) return 'post-market';
  return null;
};

// "Aug 26, 2026 7:51 AM ET" / "Closed at Aug 25, 2026 4:00 PM ET" — the label is
// free text, so fall back to now when it doesn't parse rather than dropping the quote.
// The time is New York wall-clock; reading it in the server's zone put after-hours
// prints four hours in the past on a UTC host.
const parseNasdaqTimestamp = (raw: string | undefined | null): string => {
  const cleaned = String(raw ?? '')
    .replace(/^(closed at|last updated|as of)\s+/i, '')
    .replace(/\s*ET\b.*$/i, '')
    .trim();
  const parsed = moment.utc(cleaned, ['MMM D, YYYY h:mm A', 'MMM D, YYYY'], true);
  if (!parsed.isValid()) return moment().toISOString();
  return etTimestamp(parsed.format('YYYY-MM-DD'), parsed.hours() * 60 + parsed.minutes());
};

// Which NASDAQ asset class a symbol answered as. NASDAQ rejects the wrong one, so
// remembering it saves a failed round trip on every later quote, chart and
// dividend lookup; unknown symbols try stocks first since most holdings are.
type AssetClass = 'stocks' | 'etf';
const knownAssetClass = new Map<string, AssetClass>();
const assetClassOrder = (symbol: string): AssetClass[] =>
  knownAssetClass.get(symbol) === 'etf' ? ['etf', 'stocks'] : ['stocks', 'etf'];

const blockPrice = (block: PriceBlock | undefined): number => parseDollarAmount(block?.lastSalePrice);

const fetchNasdaqQuote = async (symbol: string, assetclass: AssetClass): Promise<NasdaqQuote | null> => {
  const base = `https://api.nasdaq.com/api/quote/${symbol}`;
  const opts = { httpsAgent: nasdaqAgent, headers: nasdaqHeaders, timeout: QUOTE_TIMEOUT_MS };

  let info: any;
  try {
    const res = await axios.get(`${base}/info?assetclass=${assetclass}`, opts);
    info = res.data?.data;
  } catch (error: any) {
    // Expected when the symbol isn't in this assetclass — caller retries the other.
    logger.log({
      level: 'warn',
      label: `NASDAQ quote ${symbol}`,
      message: `info fetch as ${assetclass} failed: ${error.message}`,
    });
    return null;
  }

  const primary: PriceBlock = info?.primaryData ?? {};
  const secondary: PriceBlock = info?.secondaryData ?? {};
  const extendedSession = extendedSessionFor(String(info?.marketStatus ?? ''));

  // In an extended session the *regular* quote lives in secondaryData; only treat
  // it that way when it actually carries a price, so a malformed response falls
  // back to the primary block instead of pricing the holding at zero.
  const useSecondaryAsRegular = !!extendedSession && blockPrice(secondary) > 0;
  const regular = useSecondaryAsRegular ? secondary : primary;

  const price = blockPrice(regular);
  if (!price) return null;

  let summary: any = {};
  try {
    const res = await axios.get(`${base}/summary?assetclass=${assetclass}`, opts);
    summary = res.data?.data?.summaryData ?? {};
  } catch (error: any) {
    // summary is optional; the /info response alone is enough for the core fields.
    logger.log({
      level: 'warn',
      label: `NASDAQ quote ${symbol}`,
      message: `summary fetch as ${assetclass} failed (using info only): ${error.message}`,
    });
  }

  const change = parseDollarAmount(regular.netChange);
  const percentChange = parsePercent(regular.percentageChange);

  // Derive the previous close from the session's own change so price, change and
  // prevClose always describe the same session. NASDAQ's summary PreviousClose is
  // relative to *now*, which during pre-market is the very close being read here
  // as the regular quote — using it directly would make prevClose === price.
  const derivedPrevClose = change ? +(price - change).toFixed(4) : 0;
  const prevClose = derivedPrevClose || parseDollarAmount(summary.PreviousClose?.value);
  // TodayHighLow reads "high/low" and keyStats' range "low - high"; take the
  // extremes rather than trusting either order.
  const dayRange: string = summary.TodayHighLow?.value ?? summary.DayRange?.value ?? '';
  const bounds = dayRange
    .split(/\s*[-/]\s*/)
    .map(parseDollarAmount)
    .filter((n) => n > 0);
  const high = bounds.length ? Math.max(...bounds) : 0;
  const low = bounds.length ? Math.min(...bounds) : 0;

  // NASDAQ's own extended-hours change is quoted against the previous close, not
  // against the session it interrupts, so derive it from the regular close instead
  // — that is the number a broker shows next to "pre-market".
  const extendedPrice = useSecondaryAsRegular ? blockPrice(primary) : 0;
  const extended: ExtendedQuote | null =
    extendedSession && extendedPrice > 0
      ? {
          price: extendedPrice,
          change: +(extendedPrice - price).toFixed(4),
          percentChange: +(((extendedPrice - price) / price) * 100).toFixed(2),
          session: extendedSession,
          asOf: parseNasdaqTimestamp(info?.primaryData?.lastTradeTimestamp),
        }
      : null;

  return {
    c: price,
    d: change,
    dp: percentChange,
    h: high || price,
    l: low || price,
    o: 0,
    pc: prevClose || price,
    t: Math.floor(Date.now() / 1000),
    extended,
  };
};

export const getQuoteFromNasdaq = async (symbol: string): Promise<NasdaqQuote> => {
  for (const assetclass of assetClassOrder(symbol)) {
    const quote = await fetchNasdaqQuote(symbol, assetclass);
    if (quote) {
      knownAssetClass.set(symbol, assetclass);
      const extendedNote = quote.extended
        ? `, ${quote.extended.session} ${quote.extended.price} (${quote.extended.percentChange}%)`
        : '';
      logger.log({
        level: 'info',
        label: `NASDAQ quote ${symbol}`,
        message: `Fetched as ${assetclass} (price ${quote.c}${extendedNote})`,
      });
      return quote;
    }
  }
  throw new Error(`NASDAQ has no quote for symbol ${symbol}`);
};

// Market-wide top gainers/losers, restricted to liquid mid-cap-and-up names above
// a price floor (see constants above) so the lists are actually useful rather than
// penny-stock noise. Pulls the filtered screener universe once, then ranks by
// % change to derive both lists. Public market data, unrelated to the user's holdings.
export const getMarketMovers = async (): Promise<{ gainers: NasdaqMover[]; losers: NasdaqMover[] }> => {
  const url = `https://api.nasdaq.com/api/screener/stocks?tableonly=false&limit=25&offset=0&marketcap=${MOVER_MARKETCAP_TIERS}&download=true`;

  return axios
    .get(url, { httpsAgent: nasdaqAgent, headers: nasdaqHeaders })
    .then((response) => {
      const rows = response.data?.data?.rows ?? response.data?.data?.table?.rows ?? [];
      const parsed: NasdaqMover[] = rows
        .map((r: any) => ({
          symbol: r.symbol,
          name: r.name,
          price: parseDollarAmount(r.lastsale),
          change: parseDollarAmount(r.netchange),
          changePercent: parsePercent(r.pctchange),
          marketCap: parseFloat(String(r.marketCap ?? '').replace(/[^0-9.]/g, '')) || 0,
          volume: parseInt(String(r.volume ?? '').replace(/[^0-9]/g, ''), 10) || 0,
        }))
        .filter(
          (m: NasdaqMover) =>
            m.symbol &&
            Number.isFinite(m.changePercent) &&
            m.changePercent !== 0 &&
            m.price >= MOVER_MIN_PRICE &&
            m.marketCap >= MOVER_MIN_MARKETCAP
        );

      const gainers = [...parsed].sort((a, b) => b.changePercent - a.changePercent).slice(0, MOVER_LIMIT);
      const losers = [...parsed].sort((a, b) => a.changePercent - b.changePercent).slice(0, MOVER_LIMIT);
      return { gainers, losers };
    })
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: 'NASDAQ market movers',
        message: `Request failed: ${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });
      throw error;
    });
};

const parseRowNumber = (raw: string | undefined): number => parseFloat(String(raw ?? '').replace(/\$|,/g, ''));

type Candle = { x: Date; y: [number, number, number, number] };

// NASDAQ's historical endpoint 400s with "Symbol not exists." when the assetclass
// is wrong, so try the remembered class first. Returns the raw daily rows, newest
// first; callers map to their own shape.
const fetchHistoricalRows = async (symbol: string, fromDate: string): Promise<any[]> => {
  const toDate = moment().format('YYYY-MM-DD');

  for (const assetclass of assetClassOrder(symbol)) {
    try {
      const response = await axios.get(
        `https://api.nasdaq.com/api/quote/${symbol}/historical?assetclass=${assetclass}&fromdate=${fromDate}&limit=1000&todate=${toDate}`,
        { httpsAgent: nasdaqAgent, headers: nasdaqHeaders, timeout: QUOTE_TIMEOUT_MS }
      );
      const rows = response.data?.data?.tradesTable?.rows;
      if (rows?.length) {
        knownAssetClass.set(symbol, assetclass);
        return rows;
      }
    } catch (error: any) {
      // Expected when the symbol isn't in this assetclass — we retry the other.
      logger.log({
        level: 'warn',
        label: `NASDAQ price history "${symbol}"`,
        message: `fetch as ${assetclass} failed: ${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });
    }
  }
  return [];
};

// Today's minute-by-minute prints (pre-market through after-hours). NASDAQ stamps
// them with New York wall-clock time encoded as if it were UTC.
const fetchIntradayPoints = async (
  symbol: string
): Promise<Array<{ at: number; etMinutes: number; price: number }>> => {
  for (const assetclass of assetClassOrder(symbol)) {
    try {
      const response = await axios.get(`https://api.nasdaq.com/api/quote/${symbol}/chart?assetclass=${assetclass}`, {
        httpsAgent: nasdaqAgent,
        headers: nasdaqHeaders,
        timeout: QUOTE_TIMEOUT_MS,
      });
      const points = response.data?.data?.chart;
      if (Array.isArray(points) && points.length) {
        knownAssetClass.set(symbol, assetclass);
        return points
          .filter((p: any) => Number.isFinite(p?.x) && Number(p?.y) > 0)
          .map((p: any) => {
            const wall = new Date(p.x);
            const etMinutes = wall.getUTCHours() * 60 + wall.getUTCMinutes();
            const dateStr = wall.toISOString().slice(0, 10);
            return { at: new Date(etTimestamp(dateStr, etMinutes)).getTime(), etMinutes, price: Number(p.y) };
          });
      }
    } catch (error: any) {
      logger.log({
        level: 'warn',
        label: `NASDAQ intraday "${symbol}"`,
        message: `fetch as ${assetclass} failed: ${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });
    }
  }
  return [];
};

const REGULAR_OPEN_MIN = 9 * 60 + 30;
const REGULAR_CLOSE_MIN = 16 * 60;
const INTRADAY_BUCKET_MIN = 5;

const candleOf = (x: Date, prices: number[]): Candle => ({
  x,
  y: [prices[0], Math.max(...prices), Math.min(...prices), prices[prices.length - 1]],
});

// Calendar days to ask for so a range covers its sessions; 5d means the last five
// sessions, not five calendar days (which is three over a weekend).
const RANGE_DAYS: Record<Exclude<Range, '1d'>, number> = {
  '5d': 10,
  '1M': 31,
  '3M': 92,
  '6M': 183,
  '1y': 366,
  '2y': 731,
  '3y': 1096,
};

// Daily closes as [timestamp, close] pairs, oldest last, for the analytics maths.
export const getPriceHistoryAreaChart = async (
  symbol: string,
  range: Exclude<Range, '1d'>
): Promise<Array<[number, number]>> => {
  const rows = await fetchHistoricalRows(symbol, moment().subtract(RANGE_DAYS[range], 'days').format('YYYY-MM-DD'));
  return rows.map((x: any) => [parseInt(moment(x.date, 'MM/DD/YYYY').format('x')), parseRowNumber(x.close)]);
};

// open high low close
// [ { x: new Date(1538778600000), y: [6629.81, 6650.5, 6623.04, 6633.33] } ]
export const getPriceHistoryCandleStick = async (symbol: string, range: Range): Promise<Candle[]> => {
  if (range === '1d') {
    // Five-minute candles across today's prints, extended hours included.
    const points = await fetchIntradayPoints(symbol);
    const buckets = new Map<number, number[]>();
    for (const p of points) {
      const bucket = Math.floor(p.at / (INTRADAY_BUCKET_MIN * 60_000)) * INTRADAY_BUCKET_MIN * 60_000;
      buckets.set(bucket, [...(buckets.get(bucket) ?? []), p.price]);
    }
    return [...buckets.entries()].sort(([a], [b]) => a - b).map(([at, prices]) => candleOf(new Date(at), prices));
  }

  const fromDate = moment().subtract(RANGE_DAYS[range], 'days').format('YYYY-MM-DD');
  const [rows, intraday] = await Promise.all([
    fetchHistoricalRows(symbol, fromDate),
    // The daily history only publishes a session the next day; build today's bar
    // from the intraday prints so the chart ends where the quote is.
    isTradingDay() && etDateAndMinutes().minutes >= REGULAR_OPEN_MIN
      ? fetchIntradayPoints(symbol)
      : Promise.resolve([]),
  ]);

  const daily: Candle[] = rows
    .map((x: any) => ({
      x: new Date(x.date),
      y: [
        parseRowNumber(x.open),
        parseRowNumber(x.high),
        parseRowNumber(x.low),
        parseRowNumber(x.close),
      ] as Candle['y'],
    }))
    .filter((c: Candle) => c.y.every((n) => Number.isFinite(n) && n > 0))
    .sort((a: Candle, b: Candle) => a.x.getTime() - b.x.getTime());

  const today = etDateAndMinutes().dateStr;
  const session = intraday.filter((p) => p.etMinutes >= REGULAR_OPEN_MIN && p.etMinutes < REGULAR_CLOSE_MIN);
  const hasToday = daily.some((c) => moment(c.x).format('YYYY-MM-DD') === today);
  if (session.length && !hasToday)
    daily.push(
      candleOf(
        new Date(`${today}T00:00:00`),
        session.map((p) => p.price)
      )
    );

  return range === '5d' ? daily.slice(-5) : daily;
};

export type NasdaqDividendRow = {
  exOrEffDate: string;
  type: string;
  amount: number;
  declarationDate: string;
  recordDate: string;
  paymentDate: string;
};

export type NasdaqDividends = {
  symbol: string;
  // Next scheduled ex-dividend date, empty when none is announced.
  exDividendDate: string;
  dividendPaymentDate: string;
  annualizedDividend: number;
  yieldPercent: number;
  payoutRatio: number;
  history: NasdaqDividendRow[];
};

// NASDAQ renders "N/A" and empty strings for missing dates; normalise both to ''
// so callers only have to check for falsy.
const parseNasdaqDate = (raw: string | undefined | null): string => {
  if (!raw || raw === 'N/A') return '';
  const parsed = moment(raw, ['MM/DD/YYYY', 'YYYY-MM-DD', moment.ISO_8601], true);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
};

// Public dividend calendar and rate data for a ticker. Free, key-less, and the
// same host the quote fallback already uses. Returns null when the symbol pays
// no dividend or NASDAQ has no record of it.
// NASDAQ publishes no distribution data for ETFs (every field is "N/A"), so an
// ETF comes back null here; callers say so rather than counting it as a non-payer.
export const getDividendsFromNasdaq = async (symbol: string): Promise<NasdaqDividends | null> => {
  let data: any;
  for (const assetclass of assetClassOrder(symbol)) {
    try {
      const res = await axios.get(`https://api.nasdaq.com/api/quote/${symbol}/dividends?assetclass=${assetclass}`, {
        httpsAgent: nasdaqAgent,
        headers: nasdaqHeaders,
        timeout: 10000,
      });
      data = res.data?.data;
      if (data) {
        knownAssetClass.set(symbol, assetclass);
        break;
      }
    } catch (error: any) {
      const err = error as AxiosError;
      logger.log({
        level: 'warn',
        label: `NASDAQ dividends ${symbol}`,
        message: `as ${assetclass}: ${err.message} (status ${err.response?.status ?? 'n/a'})`,
      });
    }
  }

  if (!data) return null;

  const rows = Array.isArray(data.dividends?.rows) ? data.dividends.rows : [];
  const history: NasdaqDividendRow[] = rows
    .map((row: any) => ({
      exOrEffDate: parseNasdaqDate(row?.exOrEffDate),
      type: String(row?.type ?? '').trim(),
      amount: parseDollarAmount(row?.amount),
      declarationDate: parseNasdaqDate(row?.declarationDate),
      recordDate: parseNasdaqDate(row?.recordDate),
      paymentDate: parseNasdaqDate(row?.paymentDate),
    }))
    .filter((row: NasdaqDividendRow) => row.amount > 0);

  const listedAnnual = parseDollarAmount(data.annualizedDividend);
  const yieldPercent = parsePercent(data.yield);

  // A non-payer comes back with empty dates, a zero rate and no history.
  if (!listedAnnual && history.length === 0) return null;

  // NASDAQ's headline rate and ex-date lag a newly declared dividend that its own
  // history already lists, so read both from the history: the latest regular
  // payment times how often it paid over the last year, and the next ex-date
  // that hasn't passed.
  const today = moment().format('YYYY-MM-DD');
  const regular = history.filter((row) => !/special/i.test(row.type) && row.exOrEffDate);
  const yearAgo = moment().subtract(1, 'year').format('YYYY-MM-DD');
  const paymentsPerYear = regular.filter((row) => row.exOrEffDate > yearAgo && row.exOrEffDate <= today).length;
  const latest = regular[0];
  const annualizedDividend =
    latest && paymentsPerYear > 0 ? +(latest.amount * paymentsPerYear).toFixed(4) : listedAnnual;
  const upcoming = [...regular].reverse().find((row) => row.exOrEffDate >= today);
  const listedExDate = parseNasdaqDate(data.exDividendDate);

  return {
    symbol: symbol.toUpperCase(),
    exDividendDate: upcoming?.exOrEffDate ?? (listedExDate >= today ? listedExDate : ''),
    dividendPaymentDate: upcoming?.paymentDate ?? parseNasdaqDate(data.dividendPaymentDate),
    annualizedDividend,
    yieldPercent,
    payoutRatio: parsePercent(data.payoutRatio),
    history,
  };
};
