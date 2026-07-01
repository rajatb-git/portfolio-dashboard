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
};

const fetchNasdaqQuote = async (symbol: string, assetclass: 'etf' | 'stocks'): Promise<QuoteResponse | null> => {
  const base = `https://api.nasdaq.com/api/quote/${symbol}`;
  const opts = { httpsAgent: nasdaqAgent, headers: nasdaqHeaders };

  let info: any;
  try {
    const res = await axios.get(`${base}/info?assetclass=${assetclass}`, opts);
    info = res.data?.data;
  } catch {
    return null;
  }

  const price = parseDollarAmount(info?.primaryData?.lastSalePrice);
  if (!price) return null;

  let summary: any = {};
  try {
    const res = await axios.get(`${base}/summary?assetclass=${assetclass}`, opts);
    summary = res.data?.data?.summaryData ?? {};
  } catch {
    // summary is optional; the /info response alone is enough for the core fields.
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

// Market-wide top gainers/losers. NASDAQ precomputes these into MostAdvanced /
// MostDeclined (10 rows each, ranked by % change), so this is a single request that
// feeds both lists — no client-side sorting of the full universe. These are the
// whole market's movers (public data), unrelated to the user's holdings, and they
// naturally include low-priced/penny names just like NASDAQ's own movers page.
export const getMarketMovers = async (): Promise<{ gainers: NasdaqMover[]; losers: NasdaqMover[] }> => {
  const mapRows = (section: any): NasdaqMover[] =>
    (section?.table?.rows ?? [])
      .map((r: any) => ({
        symbol: r.symbol,
        name: r.name,
        price: parseDollarAmount(r.lastSalePrice),
        change: parseDollarAmount(r.lastSaleChange),
        changePercent: parsePercent(r.change),
      }))
      .filter((m: NasdaqMover) => m.symbol);

  return axios
    .get('https://api.nasdaq.com/api/marketmovers', { httpsAgent: nasdaqAgent, headers: nasdaqHeaders })
    .then((response) => {
      const stocks = response.data?.data?.STOCKS;
      return { gainers: mapRows(stocks?.MostAdvanced), losers: mapRows(stocks?.MostDeclined) };
    })
    .catch((error: AxiosError) => {
      logger.log({ level: 'error', label: error.status, message: `NASDAQ market movers failed: ${error.message}` });
      throw error;
    });
};

export const getPriceHistoryAreaChart = (symbol: string, range: Range): Promise<any> => {
  const toDate = moment().format('YYYY-MM-DD');
  const fromDate = moment()
    .subtract(parseInt(range.substring(0, 1)), range.substring(1) as any)
    .format('YYYY-MM-DD');

  return axios
    .get(
      `https://api.nasdaq.com/api/quote/${symbol}/historical?assetclass=stocks&fromdate=${fromDate}&limit=1000&todate=${toDate}`,
      {
        httpsAgent: nasdaqAgent,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'PostmanRuntime/7.26.8' },
      }
    )
    .then((response) => {
      const rows = response.data?.data?.tradesTable?.rows;
      if (!rows) return [];
      return rows.map((x: any) => {
        return [parseInt(moment(x.date).format('x')), parseFloat(x.close.replace(/\$|\,/g, ''))];
      });
    })
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: error.status,
        error: JSON.stringify(error),
        message: error.message,
      });

      throw error;
    });
};

// open high low close

// [
//   {
//     x: new Date(1538778600000),
//     y: [6629.81, 6650.5, 6623.04, 6633.33]
//   }
// ]
export const getPriceHistoryCandleStick = (symbol: string, range: Range): Promise<any> => {
  const toDate = moment().format('YYYY-MM-DD');
  const fromDate = moment()
    .subtract(parseInt(range.substring(0, 1)), range.substring(1) as any)
    .format('YYYY-MM-DD');

  return axios
    .get(
      `https://api.nasdaq.com/api/quote/${symbol}/historical?assetclass=stocks&fromdate=${fromDate}&limit=1000&todate=${toDate}`,
      {
        httpsAgent: nasdaqAgent,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'PostmanRuntime/7.26.8' },
      }
    )
    .then((response) => {
      const rows = response.data?.data?.tradesTable?.rows;
      if (!rows) return [];
      return rows.map((x: any) => {
        return {
          x: new Date(x.date),
          y: [
            parseFloat(x.open.replace(/\$|\,/g, '')),
            parseFloat(x.high.replace(/\$|\,/g, '')),
            parseFloat(x.low.replace(/\$|\,/g, '')),
            parseFloat(x.close.replace(/\$|\,/g, '')),
          ],
        };
      });
    })
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: error.status,
        error: JSON.stringify(error),
        message: error.message,
      });

      throw error;
    });
};
