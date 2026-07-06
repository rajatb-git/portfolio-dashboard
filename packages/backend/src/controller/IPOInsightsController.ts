import moment from 'moment';
import { getActiveProvider } from '../aiProviders';
import { getCompanyNews } from '../externalApis/finnHub';
import { CacheDBModel } from '../models/CacheModel';
import { logger } from '../utils/winston';

export type IPOInput = {
  name: string;
  symbol?: string;
  exchange?: string;
  status?: string;
  date?: string;
  price?: string;
  numberOfShares?: number;
  totalSharesValue?: number;
};

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

const CACHE_PREFIX = 'ipo_insight_';
const CACHE_HOURS = 12;

// IPO-specific system prompt. Upcoming IPOs have almost no structured market data
// (no price history, no profile2, no company-news until they list), so the model is
// asked to lean on its own knowledge of the company to explain the business and judge
// the offering. Schema matches AgentInsight so the frontend reuses the same card.
const IPO_SYSTEM_PROMPT = `You are a senior equity research analyst evaluating a stock-market IPO. You are given the public terms of the offering. Most upcoming IPOs have little structured market data, so use your own knowledge of the company (its business, sector, competitors, funding history) together with the offering terms to judge whether the IPO looks worth investing in. Respond ONLY with valid JSON matching this exact schema (no markdown, no code fences):
{
  "summary": "2-3 sentences: what the company does and an overall read on whether this IPO looks worth investing in",
  "sentiment": "bullish" | "bearish" | "neutral",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "risks": ["risk 1", "risk 2"],
  "catalysts": ["catalyst 1", "catalyst 2"]
}
"sentiment" is your lean: "bullish" = looks worth considering, "bearish" = better to avoid, "neutral" = unclear / wait and see. ALWAYS describe what the company does in the summary, drawing on your knowledge of it. If you do not recognise the company or the data is too thin to judge, say so plainly in the summary and use "neutral". Do not invent specific financials you were not given. Do not give personalised financial advice - frame everything as analysis observations.`;

export class IPOInsightsController {
  private buildPrompt = (ipo: IPOInput, newsHeadlines: string[]): string => {
    const sections: string[] = [
      `Evaluate the following IPO and judge whether it looks worth investing in.`,
      `\nIPO DETAILS:\nCompany: ${ipo.name}\nSymbol: ${ipo.symbol || 'not yet assigned'}\nExchange: ${ipo.exchange || 'N/A'}\nStatus: ${ipo.status || 'N/A'}\nExpected Date: ${ipo.date ? moment(ipo.date).format('MMM D, YYYY') : 'N/A'}\nOffer Price: ${ipo.price ? `$${ipo.price}` : 'N/A'}\nShares Offered: ${ipo.numberOfShares || 'N/A'}\nTotal Offering Value: ${ipo.totalSharesValue ? `$${ipo.totalSharesValue}` : 'N/A'}`,
    ];

    if (newsHeadlines.length > 0) {
      sections.push(`\nRECENT NEWS HEADLINES:\n${newsHeadlines.map((h) => `  - ${h}`).join('\n')}`);
    }

    return sections.join('\n');
  };

  // Company-news only returns data once a ticker is actually trading, so this is a
  // best-effort enrichment for already-priced/listed IPOs — never a hard dependency.
  private getNewsHeadlines = async (symbol?: string): Promise<string[]> => {
    if (!symbol) return [];
    try {
      const news = await getCompanyNews(
        symbol,
        moment().subtract(30, 'days').format('YYYY-MM-DD'),
        moment().format('YYYY-MM-DD')
      );
      return (news ?? [])
        .slice(0, 8)
        .map((n: any) => `${n.headline} (${moment.unix(n.datetime).format('MMM D')})`);
    } catch {
      return [];
    }
  };

  getInsights = async (ipo: IPOInput): Promise<AgentInsight> => {
    if (!ipo?.name) {
      throw new Error('IPO company name is required');
    }

    const cacheModel = await CacheDBModel().initialize();
    const cacheKey = CACHE_PREFIX + (ipo.symbol || ipo.name).toUpperCase() + '_' + (ipo.date || '');
    const cached = cacheModel.findById(cacheKey);

    if (cached && moment().diff(moment(cached.updatedAt), 'hours') < CACHE_HOURS) {
      try {
        return JSON.parse(cached.value);
      } catch {
        // stale/corrupt cache, regenerate
      }
    }

    const provider = await getActiveProvider();
    const newsHeadlines = await this.getNewsHeadlines(ipo.symbol);
    const prompt = this.buildPrompt(ipo, newsHeadlines);

    const rawText = await provider.generateInsight(IPO_SYSTEM_PROMPT, prompt);

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
        label: 'IPOInsights',
        message: `Failed to parse response from ${provider.name}: ${cleaned}`,
      });
      throw new Error(`Failed to parse ${provider.name} response as JSON`);
    }

    await cacheModel.insertOrUpdate({ key: cacheKey, value: JSON.stringify(insight) }, cacheKey);

    return insight;
  };
}
