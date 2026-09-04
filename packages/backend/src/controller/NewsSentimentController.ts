import moment from 'moment';
import { getCompanyNews } from '../externalApis/finnHub';
import { HoldingsModel } from '../models/HoldingsModel';
import { logger } from '../utils/winston';

export type SymbolSentiment = {
  symbol: string;
  score: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  articleCount: number;
  topHeadlines: string[];
};

export type PortfolioSentiment = {
  overall: 'positive' | 'negative' | 'neutral';
  overallScore: number;
  symbols: SymbolSentiment[];
  asOf: string;
};

const POSITIVE = [
  'surge', 'gain', 'rally', 'beat', 'record', 'rise', 'profit', 'growth', 'strong',
  'outperform', 'upgrade', 'bullish', 'soar', 'jump', 'exceed', 'boost', 'expand',
  'recover', 'positive', 'revenue',
];
const NEGATIVE = [
  'fall', 'drop', 'miss', 'loss', 'decline', 'cut', 'weak', 'underperform', 'downgrade',
  'bearish', 'sink', 'plunge', 'fail', 'concern', 'risk', 'warn', 'layoff', 'recall',
  'lawsuit', 'investigation', 'negative',
];

function scoreText(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const w of POSITIVE) if (lower.includes(w)) score++;
  for (const w of NEGATIVE) if (lower.includes(w)) score--;
  return Math.max(-2, Math.min(2, score));
}

function toBucket(score: number): 'positive' | 'negative' | 'neutral' {
  if (score > 0.15) return 'positive';
  if (score < -0.15) return 'negative';
  return 'neutral';
}

export class NewsSentimentController {
  getSentiment = async (): Promise<PortfolioSentiment> => {
    const holdingsModel = await HoldingsModel().initialize();
    const allHoldings = holdingsModel.getAllRecords();
    const symbols = [...new Set(allHoldings.filter((h) => h.type === 'stock').map((h) => h.symbol))];

    const fromDate = moment().subtract(7, 'days').format('YYYY-MM-DD');
    const toDate = moment().format('YYYY-MM-DD');

    const results: SymbolSentiment[] = [];

    await Promise.all(
      symbols.map(async (symbol) => {
        try {
          // Fans out over every holding, so it yields to anything the user is
          // waiting on rather than draining the shared Finnhub budget.
          const news = await getCompanyNews(symbol, fromDate, toDate, 'bulk');
          if (!news || news.length === 0) return;

          const scores = news.map((n: any) => scoreText(n.headline));
          const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
          const normalized = Math.max(-1, Math.min(1, avg / 2));

          results.push({
            symbol,
            score: +normalized.toFixed(2),
            sentiment: toBucket(normalized),
            articleCount: news.length,
            topHeadlines: news.slice(0, 3).map((n: any) => n.headline),
          });
        } catch (err: any) {
          logger.log({ level: 'error', label: 'NewsSentiment', message: `${symbol}: ${err.message}` });
        }
      })
    );

    results.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

    const overallScore =
      results.length > 0 ? results.reduce((s, r) => s + r.score, 0) / results.length : 0;

    return {
      overall: toBucket(overallScore),
      overallScore: +overallScore.toFixed(2),
      symbols: results,
      asOf: moment().toISOString(),
    };
  };
}
