import moment from 'moment';
import { getActiveProvider, SYSTEM_PROMPT } from '../aiProviders';
import {
  getCompanyNews,
  getEarningsHistory,
  getInsiderTransactions,
  getStockMetrics,
  getStockPeers,
} from '../externalApis/finnHub';
import { CacheDBModel } from '../models/CacheModel';
import { logger } from '../utils/winston';
import { CompanyProfileController } from './CompanyProfileController';
import { LiveQuoteController } from './LiveQuoteController';
import { LiveRecommendationController } from './LiveRecommendationController';

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

const CACHE_PREFIX = 'agent_insight_';
const CACHE_HOURS = 6;

type PeerComparison = {
  tickers: string[];
  count: number;
  avgPeRatio: number | null;
  avgPriceToBook: number | null;
  avgRoeTTM: number | null;
  avgRevenueGrowthTTMYoy: number | null;
};

const avg = (values: Array<number | null | undefined>): number | null => {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (nums.length === 0) {
    return null;
  }
  return +(nums.reduce((sum, v) => sum + v, 0) / nums.length).toFixed(2);
};

export class AgentInsightsController {
  private getPeerComparison = async (symbol: string): Promise<PeerComparison | null> => {
    const peers = (await getStockPeers(symbol))
      .filter((p) => p && p.toUpperCase() !== symbol.toUpperCase())
      .slice(0, 5);

    if (peers.length === 0) {
      return null;
    }

    const peerMetrics = await Promise.all(
      peers.map((p) =>
        getStockMetrics(p).catch(() => null)
      )
    );

    const valid = peerMetrics.filter((m): m is NonNullable<typeof m> => m !== null);
    if (valid.length === 0) {
      return null;
    }

    return {
      tickers: peers,
      count: valid.length,
      avgPeRatio: avg(valid.map((m) => m.peRatio)),
      avgPriceToBook: avg(valid.map((m) => m.priceToBook)),
      avgRoeTTM: avg(valid.map((m) => m.roeTTM)),
      avgRevenueGrowthTTMYoy: avg(valid.map((m) => m.revenueGrowthTTMYoy)),
    };
  };

  private getMarketContext = async (symbol: string) => {
    const results: Record<string, any> = {};

    const tasks = [
      {
        key: 'quote',
        fn: () => new LiveQuoteController().getLiveQuote(symbol),
      },
      {
        key: 'profile',
        fn: () => new CompanyProfileController().getCompanyProfile2(symbol),
      },
      {
        key: 'recommendation',
        fn: () => new LiveRecommendationController().getLiveRecommendation(symbol),
      },
      { key: 'metrics', fn: () => getStockMetrics(symbol) },
      {
        key: 'news',
        fn: () =>
          getCompanyNews(symbol, moment().subtract(7, 'days').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD')),
      },
      { key: 'earnings', fn: () => getEarningsHistory(symbol) },
      { key: 'insider', fn: () => getInsiderTransactions(symbol) },
      { key: 'peers', fn: () => this.getPeerComparison(symbol) },
    ];

    await Promise.all(
      tasks.map(async ({ key, fn }) => {
        try {
          results[key] = await fn();
        } catch {
          results[key] = null;
        }
      })
    );

    return results;
  };

  private buildPrompt = (symbol: string, data: Record<string, any>): string => {
    const sections: string[] = [
      `Analyze ${symbol} based on the following market data and provide investment insights.`,
    ];

    if (data.profile) {
      sections.push(
        `\nCOMPANY PROFILE:\nName: ${data.profile.name}\nIndustry: ${data.profile.finnhubIndustry}\nCountry: ${data.profile.country}\nMarket Cap: ${data.profile.marketCapitalization}M\nShares Outstanding: ${data.profile.shareOutstanding}M`
      );
    }

    if (data.quote) {
      sections.push(
        `\nCURRENT PRICE:\nPrice: $${data.quote.price}\nChange: ${data.quote.percentChange}%\nDay High: $${data.quote.dayHigh}\nDay Low: $${data.quote.dayLow}`
      );
    }

    if (data.metrics) {
      const m = data.metrics;
      sections.push(
        `\nKEY METRICS:\nP/E Ratio: ${m.peRatio ?? 'N/A'}\n52W High: $${m.week52High ?? 'N/A'}\n52W Low: $${m.week52Low ?? 'N/A'}\nBeta: ${m.beta ?? 'N/A'}\nROE TTM: ${m.roeTTM ?? 'N/A'}\nRevenue Growth YoY: ${m.revenueGrowthTTMYoy ?? 'N/A'}%`
      );
    }

    if (data.peers && data.peers.count > 0) {
      const p = data.peers as PeerComparison;
      const fmt = (v: number | null) => (v === null ? 'N/A' : v);
      sections.push(
        `\nSECTOR / PEER COMPARISON (averages across ${p.count} peer(s): ${p.tickers.join(', ')}):\nPeer Avg P/E: ${fmt(
          p.avgPeRatio
        )}\nPeer Avg P/B: ${fmt(p.avgPriceToBook)}\nPeer Avg ROE TTM: ${fmt(
          p.avgRoeTTM
        )}\nPeer Avg Revenue Growth YoY: ${fmt(p.avgRevenueGrowthTTMYoy)}%\nCompare ${symbol}'s metrics above against these peer averages.`
      );
    }

    if (data.recommendation) {
      const r = data.recommendation;
      sections.push(
        `\nANALYST RECOMMENDATIONS:\nStrong Buy: ${r.strongBuy}\nBuy: ${r.buy}\nHold: ${r.hold}\nSell: ${r.sell}\nStrong Sell: ${r.strongSell}`
      );
    }

    if (data.earnings && data.earnings.length > 0) {
      const earningsLines = data.earnings
        .slice(0, 4)
        .map(
          (e: any) =>
            `  ${e.period}: Actual EPS ${e.actual} vs Estimate ${e.estimate} (${e.surprise > 0 ? '+' : ''}${e.surprise})`
        )
        .join('\n');
      sections.push(`\nEARNINGS HISTORY (last 4 quarters):\n${earningsLines}`);
    }

    if (data.insider && data.insider.length > 0) {
      const insiderLines = data.insider
        .slice(0, 5)
        .map(
          (t: any) =>
            `  ${t.name} (${t.transactionType}): ${t.share} shares at $${t.transactionPrice} on ${t.transactionDate}`
        )
        .join('\n');
      sections.push(`\nRECENT INSIDER TRANSACTIONS:\n${insiderLines}`);
    }

    if (data.news && data.news.length > 0) {
      const newsLines = data.news
        .slice(0, 5)
        .map((n: any) => `  - ${n.headline} (${moment.unix(n.datetime).format('MMM D')})`)
        .join('\n');
      sections.push(`\nRECENT NEWS:\n${newsLines}`);
    }

    return sections.join('\n');
  };

  getInsights = async (symbol: string): Promise<AgentInsight> => {
    const cacheModel = await CacheDBModel().initialize();
    const cacheKey = CACHE_PREFIX + symbol;
    const cached = cacheModel.findById(cacheKey);

    if (cached && moment().diff(moment(cached.updatedAt), 'hours') < CACHE_HOURS) {
      try {
        return JSON.parse(cached.value);
      } catch {
        // stale/corrupt cache, regenerate
      }
    }

    const provider = await getActiveProvider();
    const marketData = await this.getMarketContext(symbol);
    const prompt = this.buildPrompt(symbol, marketData);

    const rawText = await provider.generateInsight(SYSTEM_PROMPT, prompt);

    // Strip markdown code fences if present
    const cleaned = rawText
      .replace(/```(?:json)?\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    let insight: AgentInsight;
    try {
      const parsed = JSON.parse(cleaned);
      insight = {
        summary: parsed.summary,
        sentiment: parsed.sentiment,
        keyPoints: parsed.keyPoints ?? [],
        risks: parsed.risks ?? [],
        catalysts: parsed.catalysts ?? [],
        provider: provider.name,
        model: provider.model,
        generatedAt: moment().toISOString(),
      };
    } catch (_err) {
      logger.log({
        level: 'error',
        label: 'AgentInsights',
        message: `Failed to parse response from ${provider.name}: ${cleaned}`,
      });
      throw new Error(`Failed to parse ${provider.name} response as JSON`);
    }

    await cacheModel.insertOrUpdate({ key: cacheKey, value: JSON.stringify(insight) }, cacheKey);

    return insight;
  };
}
