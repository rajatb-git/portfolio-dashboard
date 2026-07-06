import axios, { AxiosError } from 'axios';
import { logger } from '../utils/winston';
import moment from 'moment';
import { CompanyProfile2Response, MarketNewsResponse, QuoteResponse, UpcomingIPOsResponse } from './types';
import { IRecommendation } from '../models/RecommendationModel';

export const getQuoteForSymbol = (symbol: string, isCrypto = false): Promise<QuoteResponse> => {
  const convertedSymbol = isCrypto ? `COINBASE:${symbol}-USDT` : symbol;

  // COINBASE:ETH-USDT
  return axios
    .get(process.env.FINN_HUB_API + `/quote?symbol=${convertedSymbol}`, {
      headers: { 'X-Finnhub-Token': process.env.FINN_HUB_API_KEY, 'Content-Type': 'application/json' },
    })
    .then((response) => {
      logger.log({
        level: 'info',
        response: JSON.stringify(response.data),
        label: `symbol request ${symbol}`,
        message: `${response.config.url}`,
      });

      if (response.data.c <= 0) {
        logger.log({
          level: 'error',
          label: 'Quote not found',
          message: `Quote for symbol ${symbol} not found or has a price of 0 or less`,
          ...response.data,
        });
        // throw new Error(`Quote for symbol ${symbol} not found or has a price of 0 or less`);
      }

      return response.data;
    })
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Quote request "${symbol}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });

      throw error;
    });
};

/**
 * @param  {'general'|'forex'|'crypto'|'merger'} category
 */
export const getMarketNews = (category: 'general' | 'forex' | 'crypto' | 'merger'): Promise<MarketNewsResponse> =>
  axios
    .get(process.env.FINN_HUB_API + `/news?category=${category}`, {
      headers: { 'X-Finnhub-Token': process.env.FINN_HUB_API_KEY, 'Content-Type': 'application/json' },
    })
    .then((response) => {
      logger.log({
        level: 'info',
        response: JSON.stringify(response.data),
        message: `${response.config.url}`,
        label: 'market news request',
      });

      return response.data;
    })
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Market news request "${category}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });

      throw error;
    });

/**
 * @param  {string} symbol - stock ticker
 * @param  {string} fromDate - YYYY-MM-DD
 * @param  {string} toDate - YYYY-MM-DD
 */
export const getCompanyNews = (symbol: string, fromDate: string, toDate: string): Promise<MarketNewsResponse> =>
  axios
    .get(process.env.FINN_HUB_API + `/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}`, {
      headers: { 'X-Finnhub-Token': process.env.FINN_HUB_API_KEY, 'Content-Type': 'application/json' },
    })
    .then((response) => {
      logger.log({
        level: 'info',
        response: JSON.stringify(response.data),
        message: `${response.config.url}`,
        label: 'company news request',
      });

      return response.data;
    })
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Company news request "${symbol}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });

      throw error;
    });

export const getRecommendation = async (symbol: string): Promise<IRecommendation | null> =>
  axios
    .get(process.env.FINN_HUB_API + `/stock/recommendation?symbol=${symbol}`, {
      headers: { 'X-Finnhub-Token': process.env.FINN_HUB_API_KEY, 'Content-Type': 'application/json' },
    })
    .then((response) => {
      logger.log({
        level: 'info',
        response: JSON.stringify(response.data),
        message: `${response.config.url}`,
        label: 'recommendation request',
      });

      if (response.data.buy <= 0) {
        logger.log({
          level: 'error',
          label: 'Recommendation not found',
          message: `Recommendation for symbol ${symbol} not found or has a rating of 0 or less`,
          ...response.data,
        });

        throw new Error(`Recommendation for symbol ${symbol} not found or has a rating of 0 or less`);
      }

      if (response.data && response.data[0]) {
        return {
          buy: response.data[0].buy,
          hold: response.data[0].hold,
          period: response.data[0].period,
          sell: response.data[0].sell,
          strongBuy: response.data[0].strongBuy,
          strongSell: response.data[0].strongSell,
        };
      }

      return null;
    })
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Recommendation request "${symbol}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });

      throw error;
    });

export const getUpcomingIPOs = async (): Promise<UpcomingIPOsResponse> => {
  const fromDate = moment().subtract(2, 'M').format('YYYY-MM-DD');
  const toDate = moment().add(2, 'M').format('YYYY-MM-DD');

  return axios
    .get(process.env.FINN_HUB_API + `/calendar/ipo?from=${fromDate}&to=${toDate}`, {
      headers: { 'X-Finnhub-Token': process.env.FINN_HUB_API_KEY, 'Content-Type': 'application/json' },
    })
    .then((response) => {
      logger.log({
        level: 'info',
        response: JSON.stringify(response.data),
        message: `${response.config.url}`,
        label: 'ipos request',
      });

      return response.data;
    })
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: 'IPO calendar request',
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });

      throw error;
    });
};

export const getVisaApplications = async (symbol: string): Promise<UpcomingIPOsResponse> =>
  axios
    .get(process.env.FINN_HUB_API + `/stock/visa-application?symbol=${symbol}&from=2021-01-01&to=2025-12-31`, {
      headers: { 'X-Finnhub-Token': process.env.FINN_HUB_API_KEY, 'Content-Type': 'application/json' },
    })
    .then((response) => {
      logger.log({
        level: 'info',
        response: JSON.stringify(response.data),
        message: `${response.config.url}`,
        label: 'visa applications request',
      });

      return response.data;
    })
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Visa applications request "${symbol}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });

      throw error;
    });

export const getStockMetrics = (symbol: string): Promise<any> =>
  axios
    .get(process.env.FINN_HUB_API + `/stock/metric?symbol=${symbol}&metric=all`, {
      headers: { 'X-Finnhub-Token': process.env.FINN_HUB_API_KEY, 'Content-Type': 'application/json' },
    })
    .then((response) => {
      const m = response.data.metric;
      return {
        week52High: m['52WeekHigh'],
        week52Low: m['52WeekLow'],
        week52HighDate: m['52WeekHighDate'],
        week52LowDate: m['52WeekLowDate'],
        beta: m['beta'],
        peRatio: m['peBasicExclExtraTTM'],
        priceToBook: m['pbAnnual'],
        roeTTM: m['roeTTM'],
        revenueGrowthTTMYoy: m['revenueGrowthTTMYoy'],
        avgVolume10Day: m['10DayAverageTradingVolume'],
        shortInterest: m['shortInterest'],
        shortRatio: m['shortRatio'],
      };
    })
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Stock metrics request "${symbol}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });
      throw error;
    });

export const getStockPeers = (symbol: string): Promise<string[]> =>
  axios
    .get(process.env.FINN_HUB_API + `/stock/peers?symbol=${symbol}`, {
      headers: { 'X-Finnhub-Token': process.env.FINN_HUB_API_KEY, 'Content-Type': 'application/json' },
    })
    .then((response) => response.data as string[])
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Stock peers request "${symbol}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });
      throw error;
    });

export const getEarningsCalendar = (symbol: string): Promise<any> => {
  const from = moment().format('YYYY-MM-DD');
  const to = moment().add(12, 'M').format('YYYY-MM-DD');
  return axios
    .get(process.env.FINN_HUB_API + `/calendar/earnings?symbol=${symbol}&from=${from}&to=${to}`, {
      headers: { 'X-Finnhub-Token': process.env.FINN_HUB_API_KEY, 'Content-Type': 'application/json' },
    })
    .then((response) => response.data.earningsCalendar?.[0] ?? null)
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Earnings calendar request "${symbol}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });
      throw error;
    });
};

export const getEarningsHistory = (symbol: string): Promise<any[]> =>
  axios
    .get(process.env.FINN_HUB_API + `/stock/earnings?symbol=${symbol}&limit=4`, {
      headers: { 'X-Finnhub-Token': process.env.FINN_HUB_API_KEY, 'Content-Type': 'application/json' },
    })
    .then((response) => response.data ?? [])
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Earnings history request "${symbol}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });
      throw error;
    });

export const getInsiderTransactions = (symbol: string): Promise<any[]> =>
  axios
    .get(process.env.FINN_HUB_API + `/stock/insider-transactions?symbol=${symbol}`, {
      headers: { 'X-Finnhub-Token': process.env.FINN_HUB_API_KEY, 'Content-Type': 'application/json' },
    })
    .then((response) => (response.data?.data ?? []).slice(0, 10))
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Insider transactions request "${symbol}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });
      throw error;
    });

export const getCompanyProfile = (symbol: string): Promise<CompanyProfile2Response> =>
  axios
    .get(process.env.FINN_HUB_API + `/stock/profile2?symbol=${symbol}`, {
      headers: { 'X-Finnhub-Token': process.env.FINN_HUB_API_KEY, 'Content-Type': 'application/json' },
    })
    .then((response) => {
      logger.log({
        level: 'info',
        response: JSON.stringify(response.data),
        message: `${response.config.url}`,
        label: 'company profile request',
      });

      return response.data;
    })
    .catch((error: AxiosError) => {
      logger.log({
        level: 'error',
        label: `Company profile request "${symbol}"`,
        message: `${error.message} (status ${error.response?.status ?? 'n/a'})`,
      });

      throw error;
    });
