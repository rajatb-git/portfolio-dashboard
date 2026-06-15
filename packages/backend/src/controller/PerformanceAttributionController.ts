import { createDashboard } from './DashboardController';

export type HoldingAttribution = {
  symbol: string;
  name: string;
  accountId: string;
  type: 'stock' | 'crypto';
  totalGL: number;
  totalGLPercent: number;
  marketValue: number;
  portfolioWeight: number;
  contributionToReturn: number;
  dayGL: number;
};

export type PerformanceAttribution = {
  holdings: HoldingAttribution[];
  totalPortfolioValue: number;
  totalGL: number;
  totalGLPercent: number;
  dayGL: number;
  dayGLPercent: number;
};

export const getPerformanceAttribution = async (): Promise<PerformanceAttribution> => {
  const holdings = await createDashboard();

  const totalValue = holdings.reduce((s, h) => s + h.marketValue, 0);
  const totalGL = holdings.reduce((s, h) => s + h.totalGL, 0);
  const totalCost = holdings.reduce((s, h) => s + h.originalValue, 0);
  const totalGLPercent = totalCost > 0 ? (totalGL / totalCost) * 100 : 0;

  const dayGLs = holdings.map((h) => h.marketValue * (h.percentChange / 100));
  const dayGL = dayGLs.reduce((s, v) => s + v, 0);
  const prevValue = totalValue - dayGL;
  const dayGLPercent = prevValue > 0 ? (dayGL / prevValue) * 100 : 0;

  const attributions: HoldingAttribution[] = holdings
    .map((h, i) => {
      const weight = totalValue > 0 ? h.marketValue / totalValue : 0;
      const glPct = h.originalValue > 0 ? (h.totalGL / h.originalValue) * 100 : 0;
      return {
        symbol: h.symbol,
        name: h.name,
        accountId: h.accountId,
        type: h.type,
        totalGL: +h.totalGL.toFixed(2),
        totalGLPercent: +glPct.toFixed(2),
        marketValue: +h.marketValue.toFixed(2),
        portfolioWeight: +(weight * 100).toFixed(2),
        contributionToReturn: totalCost > 0 ? +(h.totalGL / totalCost * 100).toFixed(2) : 0,
        dayGL: +dayGLs[i].toFixed(2),
      };
    })
    .sort((a, b) => b.totalGL - a.totalGL);

  return {
    holdings: attributions,
    totalPortfolioValue: +totalValue.toFixed(2),
    totalGL: +totalGL.toFixed(2),
    totalGLPercent: +totalGLPercent.toFixed(2),
    dayGL: +dayGL.toFixed(2),
    dayGLPercent: +dayGLPercent.toFixed(2),
  };
};
