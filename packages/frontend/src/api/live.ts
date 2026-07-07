import axios from './axios';

import { DB_HOST } from '@/config';
import { IIPO } from '@/models/IPOModel';
import { IMarketNews } from '@/models/MarketNews';
import { IPriceStore } from '@/models/PriceStoreModel';
import { IRecommendation } from '@/models/RecommendationModel';
import { catchCustomError } from './apiUtil';

export type Range = '1d' | '5d' | '1M' | '3M' | '6M' | '1y' | '2y' | '3y';

export type AgentInsight = {
  summary: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  rating: 'buy' | 'hold' | 'sell';
  rationale: string;
  keyPoints: string[];
  risks: string[];
  catalysts: string[];
  provider: string;
  model: string;
  generatedAt: string;
};

export type MarketNewsArticle = {
  headline: string;
  summary: string;
  source: string;
  url: string;
  imageUrl: string;
  publishedAt: string;
};

export type MarketNewsDigest = {
  articles: MarketNewsArticle[];
  source: string;
  generatedAt: string;
};

export type MarketMover = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
};

export type MarketMovers = {
  gainers: MarketMover[];
  losers: MarketMover[];
  generatedAt: string;
};

export type MarketSession = 'pre-market' | 'regular' | 'post-market' | 'closed';

export type MarketStatus = {
  isOpen: boolean;
  session: MarketSession;
  holiday: string | null;
  exchange: string;
  timezone: string;
  generatedAt: string;
};

export type DocumentParseResult = {
  target: 'transactions' | 'holdings';
  rows: Array<Record<string, any>>;
  skipped: string[];
  provider: string;
  model: string;
};

export type AiConfig = {
  enabled: boolean;
  provider: 'claude' | 'gemini' | 'ollama';
  claudeApiKey: string;
  claudeModel: string;
  geminiApiKey: string;
  geminiModel: string;
  ollamaHost: string;
  ollamaModel: string;
};

export default class LiveAPI {
  getLivePrice = async (symbol: string): Promise<IPriceStore> =>
    axios(DB_HOST + `/live/quote/${symbol}`)
      .then((response) => {
        return response.data;
      })
      .catch(catchCustomError);

  getLiveRecommendation = async (symbol: string): Promise<IRecommendation> =>
    axios(DB_HOST + `/live/recommendation/${symbol}`).then((response) => {
      return response.data;
    });

  getLiveNews = async (symbol: string): Promise<Array<IMarketNews>> =>
    axios(DB_HOST + `/live/news/${symbol}`)
      .then((response) => {
        return response.data;
      })
      .catch(catchCustomError);

  getPriceHistory = async (symbol: string, timePeriod: Range): Promise<Array<[number, number]>> =>
    axios(DB_HOST + `/live/history/${symbol}?range=${timePeriod}`)
      .then((response) => {
        return response.data;
      })
      .catch(catchCustomError);

  getIPOs = async (): Promise<Array<IIPO>> =>
    axios(DB_HOST + '/live/ipos')
      .then((response) => {
        return response.data;
      })
      .catch(catchCustomError);

  watchIpo = async (ipo: IIPO): Promise<IIPO> =>
    axios
      .put(DB_HOST + `/live/ipos/${encodeURIComponent(ipo.symbol)}/watch`, { name: ipo.name, date: ipo.date })
      .then((response) => response.data)
      .catch(catchCustomError);

  unwatchIpo = async (symbol: string): Promise<{ symbol: string; watched: boolean }> =>
    axios
      .delete(DB_HOST + `/live/ipos/${encodeURIComponent(symbol)}/watch`)
      .then((response) => response.data)
      .catch(catchCustomError);

  getCompanyProfile = async (symbol: string): Promise<any> =>
    axios(DB_HOST + `/live/company-profile/${symbol}`)
      .then((response) => {
        return response.data;
      })
      .catch(catchCustomError);

  getStockMetrics = async (symbol: string): Promise<any> =>
    axios(DB_HOST + `/live/metrics/${symbol}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  getStockPeers = async (symbol: string): Promise<string[]> =>
    axios(DB_HOST + `/live/peers/${symbol}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  getEarnings = async (symbol: string): Promise<any> =>
    axios(DB_HOST + `/live/earnings/${symbol}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  getEarningsHistory = async (symbol: string): Promise<any[]> =>
    axios(DB_HOST + `/live/earnings-history/${symbol}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  getInsiderTransactions = async (symbol: string): Promise<any[]> =>
    axios(DB_HOST + `/live/insider/${symbol}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  getAgentInsights = async (symbol: string): Promise<AgentInsight> =>
    axios(DB_HOST + `/live/agent-insights/${symbol}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  getIPOInsights = async (ipo: IIPO): Promise<AgentInsight> =>
    axios
      .post(DB_HOST + '/live/ipo-insights', ipo)
      .then((response) => response.data)
      .catch(catchCustomError);

  getPortfolioSentiment = async (): Promise<any> =>
    axios(DB_HOST + '/live/portfolio-sentiment')
      .then((r) => r.data)
      .catch(catchCustomError);

  getMarketNews = async (refresh = false): Promise<MarketNewsDigest> =>
    axios(DB_HOST + `/live/market-news${refresh ? '?refresh=1' : ''}`)
      .then((r) => r.data)
      .catch(catchCustomError);

  getMarketMovers = async (refresh = false): Promise<MarketMovers> =>
    axios(DB_HOST + `/live/market-movers${refresh ? '?refresh=1' : ''}`)
      .then((r) => r.data)
      .catch(catchCustomError);

  getMarketStatus = async (refresh = false): Promise<MarketStatus> =>
    axios(DB_HOST + `/live/market-status${refresh ? '?refresh=1' : ''}`)
      .then((r) => r.data)
      .catch(catchCustomError);

  parseImportDocument = async (target: 'transactions' | 'holdings', text: string): Promise<DocumentParseResult> =>
    axios
      .post(DB_HOST + '/ai-import/parse', { target, text })
      .then((response) => response.data)
      .catch(catchCustomError);

  getAiConfig = async (): Promise<AiConfig> =>
    axios(DB_HOST + '/settings/ai-config')
      .then((response) => response.data)
      .catch(catchCustomError);

  saveAiConfig = async (config: Partial<AiConfig>): Promise<AiConfig> =>
    axios
      .post(DB_HOST + '/settings/ai-config', config)
      .then((response) => response.data)
      .catch(catchCustomError);

  exportDb = async (): Promise<Blob> =>
    axios
      .get(DB_HOST + '/settings/db/export', { responseType: 'blob' })
      .then((response) => response.data)
      .catch(catchCustomError);

  importDb = async (file: File): Promise<{ message: string }> =>
    axios
      .post(DB_HOST + '/settings/db/import', file, {
        headers: { 'Content-Type': 'application/octet-stream' },
      })
      .then((response) => response.data)
      .catch(catchCustomError);
}
