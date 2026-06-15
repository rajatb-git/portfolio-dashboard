import moment from 'moment';
import { getActiveProvider } from '../aiProviders';
import { CacheDBModel } from '../models/CacheModel';
import { logger } from '../utils/winston';
import { createDashboard } from './DashboardController';
import { calculateRiskMetrics } from './RiskAnalyticsController';
import { getSectorAllocation } from './SectorController';
import { PortfolioSnapshotDBModel } from '../models/PortfolioSnapshotModel';

export type PortfolioInsight = {
  summary: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  keyObservations: string[];
  topConcerns: string[];
  opportunities: string[];
  diversification: string;
  provider: string;
  model: string;
  generatedAt: string;
};

const CACHE_KEY = 'portfolio_insights';
const CACHE_HOURS = 4;

const PORTFOLIO_SYSTEM_PROMPT = `You are a senior portfolio manager. Given portfolio data, provide a concise portfolio-level analysis. Respond ONLY with valid JSON matching this exact schema (no markdown, no code fences):
{
  "summary": "2-3 sentence overall portfolio assessment",
  "sentiment": "bullish" | "bearish" | "neutral",
  "keyObservations": ["observation 1", "observation 2", "observation 3"],
  "topConcerns": ["concern 1", "concern 2"],
  "opportunities": ["opportunity 1", "opportunity 2"],
  "diversification": "one sentence on diversification quality"
}
Keep each point to one sentence. Be specific with numbers. Do not give financial advice.`;

export class PortfolioInsightsController {
  getInsights = async (): Promise<PortfolioInsight> => {
    const cacheModel = await CacheDBModel().initialize();
    const cached = cacheModel.findById(CACHE_KEY);

    if (cached && moment().diff(moment(cached.updatedAt), 'hours') < CACHE_HOURS) {
      try { return JSON.parse(cached.value); } catch {}
    }

    const provider = await getActiveProvider();

    const [holdings, risk, sectors] = await Promise.all([
      createDashboard().catch(() => []),
      calculateRiskMetrics().catch(() => null),
      getSectorAllocation().catch(() => []),
    ]);

    const snapshotModel = await PortfolioSnapshotDBModel().initialize();
    const allSnaps = snapshotModel.getAllRecords().sort((a, b) => a.date.localeCompare(b.date));
    const recentSnaps = allSnaps.slice(-30);

    const totalValue = holdings.reduce((s, h) => s + h.marketValue, 0);
    const totalGL = holdings.reduce((s, h) => s + h.totalGL, 0);
    const totalCost = totalValue - totalGL;
    const totalGLPct = totalCost > 0 ? (totalGL / totalCost) * 100 : 0;

    const lines: string[] = [
      `PORTFOLIO OVERVIEW:`,
      `Total Market Value: $${totalValue.toFixed(2)}`,
      `Total Gain/Loss: $${totalGL.toFixed(2)} (${totalGLPct.toFixed(2)}%)`,
      `Number of Positions: ${holdings.length}`,
    ];

    if (risk) {
      lines.push(`\nRISK METRICS:`);
      lines.push(`Annualized Return: ${risk.annualizedReturn}%`);
      lines.push(`Volatility: ${risk.volatility}%`);
      lines.push(`Sharpe Ratio: ${risk.sharpeRatio}`);
      lines.push(`Max Drawdown: ${risk.maxDrawdown}%`);
      lines.push(`Beta vs SPY: ${risk.beta}`);
    }

    if (sectors.length > 0) {
      lines.push(`\nSECTOR ALLOCATION:`);
      for (const s of sectors.slice(0, 6)) {
        lines.push(`  ${s.sector}: ${s.percentage}% ($${s.marketValue.toFixed(0)})`);
      }
    }

    if (holdings.length > 0) {
      const sorted = [...holdings].sort((a, b) => b.marketValue - a.marketValue);
      lines.push(`\nTOP POSITIONS:`);
      for (const h of sorted.slice(0, 8)) {
        const pct = totalValue > 0 ? ((h.marketValue / totalValue) * 100).toFixed(1) : '0';
        lines.push(`  ${h.symbol}: ${pct}% of portfolio, G/L: ${h.totalGLPercent}%`);
      }
      const winners = [...holdings].sort((a, b) => b.totalGLPercent - a.totalGLPercent).slice(0, 3);
      const losers = [...holdings].sort((a, b) => a.totalGLPercent - b.totalGLPercent).slice(0, 3);
      lines.push(`TOP GAINERS: ${winners.map(h => `${h.symbol} (${h.totalGLPercent}%)`).join(', ')}`);
      lines.push(`TOP LOSERS: ${losers.map(h => `${h.symbol} (${h.totalGLPercent}%)`).join(', ')}`);
    }

    if (recentSnaps.length >= 2) {
      const first = recentSnaps[0].totalValue;
      const last = recentSnaps[recentSnaps.length - 1].totalValue;
      const change = ((last - first) / first * 100).toFixed(2);
      lines.push(`\n30-DAY PERFORMANCE: ${change}% change in portfolio value`);
    }

    const prompt = lines.join('\n');
    const rawText = await provider.generateInsight(PORTFOLIO_SYSTEM_PROMPT, prompt);
    const cleaned = rawText.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();

    let insight: PortfolioInsight;
    try {
      const parsed = JSON.parse(cleaned);
      insight = {
        summary: parsed.summary,
        sentiment: parsed.sentiment,
        keyObservations: parsed.keyObservations ?? [],
        topConcerns: parsed.topConcerns ?? [],
        opportunities: parsed.opportunities ?? [],
        diversification: parsed.diversification ?? '',
        provider: provider.name,
        model: provider.model,
        generatedAt: moment().toISOString(),
      };
    } catch {
      logger.log({ level: 'error', label: 'PortfolioInsights', message: `Failed to parse AI response: ${cleaned}` });
      throw new Error(`Failed to parse ${provider.name} response as JSON`);
    }

    await cacheModel.insertOrUpdate({ key: CACHE_KEY, value: JSON.stringify(insight) }, CACHE_KEY);
    return insight;
  };
}
