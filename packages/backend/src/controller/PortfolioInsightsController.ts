import moment from 'moment';
import { OllamaProvider } from '../aiProviders/ollamaProvider';
import { getAiConfig } from '../models/AiConfigModel';
import { logger } from '../utils/winston';
import { createDashboard } from './DashboardController';

export type PortfolioInsight = {
  summary: string;
  observations: string[];
  risks: string[];
  suggestions: string[];
  provider: string;
  model: string;
  generatedAt: string;
};

const SYSTEM_PROMPT = `You are a portfolio analyst reviewing a personal investment portfolio. Reason through these dimensions using only the data provided:

1. CONCENTRATION — Assess single-position and top-3 concentration against the weights given. Flag any position above ~20% of the portfolio as a concentration risk and name it with its weight.
2. ASSET-CLASS BALANCE — Comment on the stock vs crypto split and what it implies for volatility (crypto being the higher-volatility sleeve).
3. DIVERSIFICATION — Consider the number of positions and how evenly weight is spread; a few large positions driving most of the value is less diversified than the count alone suggests.
4. PERFORMANCE DISPERSION — Note which positions are the largest winners and losers by unrealized P/L % and whether gains/losses are concentrated.

Be specific and quantitative — cite the actual weights, the asset split, and position names from the data. Frame everything as analysis observations, not personalized financial advice or a recommendation to buy or sell specific securities.

Respond ONLY with valid JSON matching this exact schema (no markdown, no code fences):
{
  "summary": "2-3 sentence overall assessment of the portfolio",
  "observations": ["observation 1", "observation 2", "observation 3"],
  "risks": ["risk 1", "risk 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;

const buildPrompt = (holdings: Awaited<ReturnType<typeof createDashboard>>): string => {
  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const totalGL = holdings.reduce((sum, h) => sum + h.totalGL, 0);

  const byValue = holdings.slice().sort((a, b) => b.marketValue - a.marketValue);
  const weightPct = (mv: number) => (totalValue > 0 ? (mv / totalValue) * 100 : 0);

  const lines = byValue
    .map((h) => {
      const weight = weightPct(h.marketValue).toFixed(1);
      return `  ${h.symbol} (${h.type}): ${weight}% of portfolio, market value $${h.marketValue.toFixed(
        0
      )}, unrealized P/L ${h.totalGLPercent}%`;
    })
    .join('\n');

  const stockValue = holdings.filter((h) => h.type === 'stock').reduce((sum, h) => sum + h.marketValue, 0);
  const cryptoValue = holdings.filter((h) => h.type === 'crypto').reduce((sum, h) => sum + h.marketValue, 0);
  const top1Weight = byValue.length > 0 ? weightPct(byValue[0].marketValue) : 0;
  const top3Weight = byValue.slice(0, 3).reduce((sum, h) => sum + weightPct(h.marketValue), 0);

  const composition = [
    `\nCOMPOSITION:`,
    `Positions: ${holdings.length}`,
    `Stock vs Crypto by value: ${weightPct(stockValue).toFixed(1)}% stock / ${weightPct(cryptoValue).toFixed(
      1
    )}% crypto`,
    `Largest position: ${byValue[0]?.symbol ?? 'N/A'} at ${top1Weight.toFixed(1)}%`,
    `Top 3 concentration: ${top3Weight.toFixed(1)}% of portfolio`,
  ].join('\n');

  return [
    `Analyze this portfolio of ${holdings.length} position(s).`,
    `Total market value: $${totalValue.toFixed(0)}`,
    `Total unrealized P/L: $${totalGL.toFixed(0)}`,
    composition,
    `\nHOLDINGS (by weight):\n${lines}`,
  ].join('\n');
};

/**
 * Portfolio-level AI analysis. This sends personal holdings, weights and P/L to
 * the AI provider, so it is HARD-LOCKED to a local Ollama provider — data never
 * leaves the user's machine. It intentionally does NOT use getActiveProvider()
 * (which is reserved for the public-data-only AgentInsightsController).
 */
export const generatePortfolioInsights = async (): Promise<PortfolioInsight> => {
  const config = await getAiConfig();

  if (!config.enabled) {
    throw new Error('AI agent is not enabled. Enable it in Settings.');
  }
  if (config.provider !== 'ollama') {
    throw new Error(
      'Portfolio AI analysis only runs on a local Ollama provider to keep your financial data private. Switch the AI provider to Ollama in Settings.'
    );
  }

  const provider = new OllamaProvider(config.ollamaHost, config.ollamaModel);
  if (!provider.isConfigured()) {
    throw new Error('Ollama is selected but not configured. Set the Ollama host in Settings.');
  }

  const holdings = await createDashboard();
  if (holdings.length === 0) {
    throw new Error('No priced holdings available to analyze.');
  }

  const rawText = await provider.generateInsight(SYSTEM_PROMPT, buildPrompt(holdings));
  const cleaned = rawText
    .replace(/```(?:json)?\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      summary: parsed.summary ?? '',
      observations: parsed.observations ?? [],
      risks: parsed.risks ?? [],
      suggestions: parsed.suggestions ?? [],
      provider: provider.name,
      model: provider.model,
      generatedAt: moment().toISOString(),
    };
  } catch {
    logger.log({ level: 'error', label: 'PortfolioInsights', message: `Failed to parse Ollama response: ${cleaned}` });
    throw new Error('Failed to parse Ollama response as JSON');
  }
};
