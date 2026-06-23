import moment from 'moment';
import { getActiveProvider } from '../aiProviders';
import { getCompanyNews, getCompanyProfile } from '../externalApis/finnHub';
import { CacheDBModel } from '../models/CacheModel';
import { IIPOModel, IPODBModel } from '../models/IPOModel';
import { logger } from '../utils/winston';

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

// IPO-specific system prompt. The schema matches AgentInsight so the frontend can
// reuse the same card. Sentiment here reads as an invest / avoid lean.
const IPO_SYSTEM_PROMPT = `You are a senior equity research analyst evaluating an upcoming or recent IPO. Given public information about the offering, assess whether the IPO looks attractive to invest in. Respond ONLY with valid JSON matching this exact schema (no markdown, no code fences):
{
  "summary": "2-3 sentences: what the company does and an overall read on whether the IPO looks worth investing in",
  "sentiment": "bullish" | "bearish" | "neutral",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "risks": ["risk 1", "risk 2"],
  "catalysts": ["catalyst 1", "catalyst 2"]
}
"sentiment" should reflect your lean: "bullish" = looks worth considering, "bearish" = better to avoid, "neutral" = unclear / wait and see. Always describe what the company does in the summary. Be specific with numbers from the data provided. Note when the offering is too early-stage or data is too thin to judge. Do not give personalised financial advice - frame everything as analysis observations.`;

export class IPOInsightsController {
  private getIPOContext = async (ipo: IIPOModel) => {
    const results: Record<string, any> = { ipo };

    if (ipo.symbol) {
      await Promise.all([
        getCompanyProfile(ipo.symbol)
          .then((res) => {
            results.profile = res;
          })
          .catch(() => {
            results.profile = null;
          }),
        getCompanyNews(
          ipo.symbol,
          moment().subtract(30, 'days').format('YYYY-MM-DD'),
          moment().format('YYYY-MM-DD')
        )
          .then((res) => {
            results.news = res;
          })
          .catch(() => {
            results.news = null;
          }),
      ]);
    }

    return results;
  };

  private buildPrompt = (ipo: IIPOModel, data: Record<string, any>): string => {
    const sections: string[] = [
      `Evaluate the following IPO and judge whether it looks worth investing in.`,
      `\nIPO DETAILS:\nCompany: ${ipo.name}\nSymbol: ${ipo.symbol || 'not yet assigned'}\nExchange: ${ipo.exchange || 'N/A'}\nStatus: ${ipo.status}\nExpected Date: ${moment(ipo.date).format('MMM D, YYYY')}\nOffer Price: ${ipo.price ? `$${ipo.price}` : 'N/A'}\nShares Offered: ${ipo.numberOfShares || 'N/A'}\nTotal Offering Value: ${ipo.totalSharesValue ? `$${ipo.totalSharesValue}` : 'N/A'}`,
    ];

    if (data.profile) {
      sections.push(
        `\nCOMPANY PROFILE:\nName: ${data.profile.name}\nIndustry: ${data.profile.finnhubIndustry}\nCountry: ${data.profile.country}\nMarket Cap: ${data.profile.marketCapitalization}M\nShares Outstanding: ${data.profile.shareOutstanding}M`
      );
    }

    if (data.news && data.news.length > 0) {
      const newsLines = data.news
        .slice(0, 8)
        .map((n: any) => `  - ${n.headline} (${moment.unix(n.datetime).format('MMM D')})`)
        .join('\n');
      sections.push(`\nRECENT NEWS:\n${newsLines}`);
    }

    return sections.join('\n');
  };

  getInsights = async (ipoId: string): Promise<AgentInsight> => {
    const ipoModel = IPODBModel();
    await ipoModel.initialize();
    const ipo = ipoModel.findById(ipoId);

    if (!ipo) {
      throw new Error('IPO not found');
    }

    const cacheModel = await CacheDBModel().initialize();
    const cacheKey = CACHE_PREFIX + ipoId;
    const cached = cacheModel.findById(cacheKey);

    if (cached && moment().diff(moment(cached.updatedAt), 'hours') < CACHE_HOURS) {
      try {
        return JSON.parse(cached.value);
      } catch {
        // stale/corrupt cache, regenerate
      }
    }

    const provider = await getActiveProvider();
    const context = await this.getIPOContext(ipo);
    const prompt = this.buildPrompt(ipo, context);

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
