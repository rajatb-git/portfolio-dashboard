import type { CompanyProfile2Response } from '../externalApis/types';
import { getCachedQuotes } from '../marketData/quotes';
import { read } from '../marketData/store';
import { HoldingsModel } from '../models/HoldingsModel';

export type SectorAllocation = {
  sector: string;
  marketValue: number;
  percentage: number;
};

// Sectors come from the company profile, which the scheduler keeps for every
// held symbol; a symbol whose profile was never fetched gets one short wait
// (all in parallel) before falling back to "Unknown".
const PROFILE_WAIT_MS = 3000;

export const getSectorAllocation = async (): Promise<SectorAllocation[]> => {
  const holdingsModel = await HoldingsModel().initialize();
  const stockHoldings = holdingsModel.getAllRecords().filter((h) => h.type === 'stock');

  if (stockHoldings.length === 0) return [];

  const uniqueSymbols = [...new Set(stockHoldings.map((h) => h.symbol.toUpperCase()))];

  const [profiles, quotes] = await Promise.all([
    Promise.all(
      uniqueSymbols.map(async (sym) => {
        const profile = await read<CompanyProfile2Response>('profile', sym, { mode: 'fresh', waitMs: PROFILE_WAIT_MS });
        return [sym, profile.value?.finnhubIndustry || 'Unknown'] as const;
      })
    ),
    getCachedQuotes(uniqueSymbols.map((symbol) => ({ symbol, isCrypto: false }))),
  ]);
  const sectorMap = new Map(profiles);

  const sectorValues = new Map<string, number>();
  for (const holding of stockHoldings) {
    const symbol = holding.symbol.toUpperCase();
    const sector = sectorMap.get(symbol) ?? 'Unknown';
    const price = quotes.get(symbol)?.value?.price ?? holding.averagePrice;
    sectorValues.set(sector, (sectorValues.get(sector) ?? 0) + holding.qty * price);
  }

  const totalValue = [...sectorValues.values()].reduce((s, v) => s + v, 0);

  return [...sectorValues.entries()]
    .map(([sector, marketValue]) => ({
      sector,
      marketValue: +marketValue.toFixed(2),
      percentage: totalValue > 0 ? +((marketValue / totalValue) * 100).toFixed(2) : 0,
    }))
    .sort((a, b) => b.marketValue - a.marketValue);
};
