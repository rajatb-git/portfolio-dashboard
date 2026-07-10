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

const fetchNasdaqQuote = async (symbol: string, assetclass: 'etf' | 'stocks'): Promise<QuoteResponse | null> => {
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

  const price = parseDollarAmount(info?.primaryData?.lastSalePrice);
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

  const change = parseDollarAmount(info.primaryData.netChange);
  const percentChange = parseFloat((info.primaryData.percentageChange ?? '0').replace(/[+%]/g, '')) || 0;

  const prevClose = parseDollarAmount(summary.PreviousClose?.value);
  const dayRange: string = summary.TodayHighLow?.value ?? summary.DayRange?.value ?? '';
  const [low, high] = dayRange.split(/\s*[-/]\s*/).map(parseDollarAmount);

  return {
    c: price,
    d: change,
    dp: percentChange,
    h: high || price,
    l: low || price,
    o: 0,
    pc: prevClose || price,
    t: Math.floor(Date.now() / 1000),
  };
};

export const getQuoteFromNasdaq = async (symbol: string): Promise<QuoteResponse> => {
  for (const assetclass of ['etf', 'stocks'] as const) {
    const quote = await fetchNasdaqQuote(symbol, assetclass);
    if (quote) {
      logger.log({
        level: 'info',
        label: `NASDAQ quote ${symbol}`,
        message: `Fetched as ${assetclass} (price ${quote.c})`,
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
