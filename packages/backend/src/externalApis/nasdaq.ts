import https from 'node:https';
import axios, { AxiosError } from 'axios';
import moment from 'moment';
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
