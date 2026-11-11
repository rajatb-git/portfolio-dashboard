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
// (all in parallel) before falling back to "Unknown". Finnhub's free plan has
// no profile for funds, so a stock symbol that answered with an empty profile
// is grouped as a fund instead. Crypto gets its own slice.
const PROFILE_WAIT_MS = 3000;
const FUNDS = 'ETFs & funds';
const CRYPTO = 'Crypto';

export const getSectorAllocation = async (): Promise<SectorAllocation[]> => {
  const holdingsModel = await HoldingsModel().initialize();
  const holdings = holdingsModel.getAllRecords();

  if (holdings.length === 0) return [];

  const stockSymbols = [...new Set(holdings.filter((h) => h.type === 'stock').map((h) => h.symbol.toUpperCase()))];
  const cryptoSymbols = [...new Set(holdings.filter((h) => h.type === 'crypto').map((h) => h.symbol.toUpperCase()))];

  const [profiles, quotes] = await Promise.all([
    Promise.all(
      stockSymbols.map(async (sym) => {
        const profile = await read<CompanyProfile2Response>('profile', sym, { mode: 'fresh', waitMs: PROFILE_WAIT_MS });
        const sector = profile.value
          ? profile.value.finnhubIndustry || (profile.value.name ? 'Unknown' : FUNDS)
          : 'Unknown';
        return [sym, sector] as const;
      })
    ),
    getCachedQuotes([
      ...stockSymbols.map((symbol) => ({ symbol, isCrypto: false })),
      ...cryptoSymbols.map((symbol) => ({ symbol, isCrypto: true })),
    ]),
  ]);
  const sectorMap = new Map(profiles);

  const sectorValues = new Map<string, number>();
  for (const holding of holdings) {
    const symbol = holding.symbol.toUpperCase();
    const sector = holding.type === 'crypto' ? CRYPTO : (sectorMap.get(symbol) ?? 'Unknown');
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
