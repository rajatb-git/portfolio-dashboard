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

const SYSTEM_PROMPT = `You are a portfolio analyst reviewing a personal investment portfolio. Respond ONLY with valid JSON matching this exact schema (no markdown, no code fences):
{
  "summary": "2-3 sentence overall assessment of the portfolio",
  "observations": ["observation 1", "observation 2", "observation 3"],
  "risks": ["risk 1", "risk 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}
Focus on diversification, concentration, sector/asset balance, and risk. Be specific with the numbers provided. Frame everything as analysis observations, not personalized financial advice.`;

const buildPrompt = (holdings: Awaited<ReturnType<typeof createDashboard>>): string => {
  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const totalGL = holdings.reduce((sum, h) => sum + h.totalGL, 0);

  const lines = holdings
    .slice()
    .sort((a, b) => b.marketValue - a.marketValue)
    .map((h) => {
      const weight = totalValue > 0 ? ((h.marketValue / totalValue) * 100).toFixed(1) : '0';
      return `  ${h.symbol} (${h.type}): ${weight}% of portfolio, market value $${h.marketValue.toFixed(
        0
      )}, unrealized P/L ${h.totalGLPercent}%`;
    })
    .join('\n');

  return [
    `Analyze this portfolio of ${holdings.length} position(s).`,
    `Total market value: $${totalValue.toFixed(0)}`,
    `Total unrealized P/L: $${totalGL.toFixed(0)}`,
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
