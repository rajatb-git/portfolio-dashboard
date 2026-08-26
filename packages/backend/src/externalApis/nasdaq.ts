import https from 'node:https';
import axios, { AxiosError } from 'axios';
import moment from 'moment';
import { QuoteResponse } from './types';
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
const parseNasdaqTimestamp = (raw: string | undefined | null): string => {
  const cleaned = String(raw ?? '')
    .replace(/^(closed at|last updated|as of)\s+/i, '')
    .replace(/\s*ET\b.*$/i, '')
    .trim();
  const parsed = moment(cleaned, ['MMM D, YYYY h:mm A', 'MMM D, YYYY'], true);
  return parsed.isValid() ? parsed.toISOString() : moment().toISOString();
};

const blockPrice = (block: PriceBlock | undefined): number => parseDollarAmount(block?.lastSalePrice);

const fetchNasdaqQuote = async (symbol: string, assetclass: 'etf' | 'stocks'): Promise<NasdaqQuote | null> => {
  const base = `https://api.nasdaq.com/api/quote/${symbol}`;
  const opts = { httpsAgent: nasdaqAgent, headers: nasdaqHeaders };

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
  const dayRange: string = summary.TodayHighLow?.value ?? summary.DayRange?.value ?? '';
  const [low, high] = dayRange.split(/\s*[-/]\s*/).map(parseDollarAmount);

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
  for (const assetclass of ['etf', 'stocks'] as const) {
    const quote = await fetchNasdaqQuote(symbol, assetclass);
    if (quote) {
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

// NASDAQ's historical endpoint 400s with "Symbol not exists." when the assetclass
// is wrong, so try stocks first (individual holdings, the common case) and fall
// through to etf — which is what the benchmark overlays (SPY/QQQ/DIA) and the beta
// calculation need. Returns the raw NASDAQ rows; callers map to their own shape.
const fetchHistoricalRows = async (symbol: string, range: Range): Promise<any[]> => {
  const toDate = moment().format('YYYY-MM-DD');
  const fromDate = moment()
    .subtract(parseInt(range.substring(0, 1)), range.substring(1) as any)
    .format('YYYY-MM-DD');

  for (const assetclass of ['stocks', 'etf'] as const) {
    try {
      const response = await axios.get(
        `https://api.nasdaq.com/api/quote/${symbol}/historical?assetclass=${assetclass}&fromdate=${fromDate}&limit=1000&todate=${toDate}`,
        { httpsAgent: nasdaqAgent, headers: nasdaqHeaders }
      );
      const rows = response.data?.data?.tradesTable?.rows;
      if (rows?.length) return rows;
    } catch (error: any) {
      // Expected when the symbol isn't in this assetclass — we retry the other.
      logger.log({
        level: 'warn',
        label: `NASDAQ price history "${symbol}" (${range})`,
        message: `fetch as ${assetclass} failed: ${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });
    }
  }
  return [];
};

export const getPriceHistoryAreaChart = async (symbol: string, range: Range): Promise<any> => {
  const rows = await fetchHistoricalRows(symbol, range);
  return rows.map((x: any) => [parseInt(moment(x.date).format('x')), parseFloat(x.close.replace(/\$|\,/g, ''))]);
};

// open high low close
// [ { x: new Date(1538778600000), y: [6629.81, 6650.5, 6623.04, 6633.33] } ]
export const getPriceHistoryCandleStick = async (symbol: string, range: Range): Promise<any> => {
  const rows = await fetchHistoricalRows(symbol, range);
  return rows.map((x: any) => ({
    x: new Date(x.date),
    y: [
      parseFloat(x.open.replace(/\$|\,/g, '')),
      parseFloat(x.high.replace(/\$|\,/g, '')),
      parseFloat(x.low.replace(/\$|\,/g, '')),
      parseFloat(x.close.replace(/\$|\,/g, '')),
    ],
  }));
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
export const getDividendsFromNasdaq = async (symbol: string): Promise<NasdaqDividends | null> => {
  const url = `https://api.nasdaq.com/api/quote/${symbol}/dividends?assetclass=stocks`;

  let data: any;
  try {
    const res = await axios.get(url, { httpsAgent: nasdaqAgent, headers: nasdaqHeaders, timeout: 10000 });
    data = res.data?.data;
  } catch (error: any) {
    const err = error as AxiosError;
    logger.log({
      level: 'warn',
      label: `NASDAQ dividends ${symbol}`,
      message: `${err.message} (status ${err.response?.status ?? 'n/a'})`,
    });
    return null;
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

  const annualizedDividend = parseDollarAmount(data.annualizedDividend);
  const yieldPercent = parsePercent(data.yield);

  // A non-payer comes back with empty dates, a zero rate and no history.
  if (!annualizedDividend && history.length === 0) return null;

  return {
    symbol: symbol.toUpperCase(),
    exDividendDate: parseNasdaqDate(data.exDividendDate),
    dividendPaymentDate: parseNasdaqDate(data.dividendPaymentDate),
    annualizedDividend,
    yieldPercent,
    payoutRatio: parsePercent(data.payoutRatio),
    history,
  };
};
