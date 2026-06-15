import { getActiveProvider } from '../aiProviders';
import { createDashboard } from './DashboardController';
import { calculateRiskMetrics } from './RiskAnalyticsController';
import { getSectorAllocation } from './SectorController';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

const CHAT_SYSTEM_PROMPT = `You are a helpful portfolio assistant. The user's current portfolio data is provided below. Answer questions about their portfolio directly and concisely. Do not give financial advice — frame responses as observations. Keep responses concise unless detail is needed.`;

const buildContext = async (): Promise<string> => {
  const [holdings, risk, sectors] = await Promise.all([
    createDashboard().catch(() => []),
    calculateRiskMetrics().catch(() => null),
    getSectorAllocation().catch(() => []),
  ]);

  const totalValue = holdings.reduce((s, h) => s + h.marketValue, 0);
  const totalGL = holdings.reduce((s, h) => s + h.totalGL, 0);

  const lines = [
    `PORTFOLIO DATA:`,
    `Total Value: $${totalValue.toFixed(2)}, Total G/L: $${totalGL.toFixed(2)}`,
    `Positions: ${holdings.length}`,
  ];

  if (holdings.length > 0) {
    lines.push('\nHOLDINGS:');
    for (const h of holdings) {
      lines.push(
        `  ${h.symbol} (${h.accountId}): qty=${h.qty}, price=$${h.currentPrice}, G/L=${h.totalGLPercent}%, value=$${h.marketValue.toFixed(2)}, target=$${h.targetPrice}`
      );
    }
  }

  if (sectors.length > 0) {
    lines.push('\nSECTORS: ' + sectors.map((s) => `${s.sector} ${s.percentage}%`).join(', '));
  }

  if (risk) {
    lines.push(
      `RISK: return=${risk.annualizedReturn}%, vol=${risk.volatility}%, sharpe=${risk.sharpeRatio}, beta=${risk.beta}`
    );
  }

  return lines.join('\n');
};

export class PortfolioChatController {
  chat = async (message: string, history: ChatMessage[] = []): Promise<string> => {
    const provider = await getActiveProvider();
    const context = await buildContext();
    const systemPrompt = `${CHAT_SYSTEM_PROMPT}\n\n${context}`;

    const historyText = history
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');
    const fullMessage = historyText ? `${historyText}\nUser: ${message}` : message;

    return provider.generateInsight(systemPrompt, fullMessage);
  };
}
