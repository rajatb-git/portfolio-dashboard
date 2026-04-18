import axios from 'axios';

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
  keyPoints: string[];
  risks: string[];
  catalysts: string[];
  provider: string;
  model: string;
  generatedAt: string;
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

  getAiConfig = async (): Promise<AiConfig> =>
    axios(DB_HOST + '/settings/ai-config')
      .then((response) => response.data)
      .catch(catchCustomError);

  saveAiConfig = async (config: Partial<AiConfig>): Promise<AiConfig> =>
    axios
      .post(DB_HOST + '/settings/ai-config', config)
      .then((response) => response.data)
      .catch(catchCustomError);
}
