import { LiveQuoteController } from '../controller/LiveQuoteController';
import { getCompanyProfile } from '../externalApis/finnHub';
import { CacheDBModel } from '../models/CacheModel';
import { HoldingsModel } from '../models/HoldingsModel';
import { logger } from '../utils/winston';

export type SectorAllocation = {
  sector: string;
  marketValue: number;
  percentage: number;
};

export const getSectorAllocation = async (): Promise<SectorAllocation[]> => {
  const holdingsModel = await HoldingsModel().initialize();
  const allHoldings = holdingsModel.getAllRecords();
  const stockHoldings = allHoldings.filter((h) => h.type === 'stock');

  if (stockHoldings.length === 0) return [];

  const uniqueSymbols = [...new Set(stockHoldings.map((h) => h.symbol))];
  const cacheModel = await CacheDBModel().initialize();
  const quoteController = new LiveQuoteController();

  // Resolve sector for each symbol (using cache + company profile)
  const sectorMap = new Map<string, string>();
  for (const sym of uniqueSymbols) {
    const cacheKey = `sector_${sym}`;
    const cached = cacheModel.findById(cacheKey);

    if (cached) {
      sectorMap.set(sym, cached.value);
      continue;
    }

    try {
      const profile = await getCompanyProfile(sym);
      const sector = profile.finnhubIndustry || 'Unknown';
      sectorMap.set(sym, sector);
      await cacheModel.insertOrUpdate({ key: cacheKey, value: sector }, cacheKey);
    } catch (err: any) {
      logger.log({ level: 'error', label: 'SectorController', message: `Failed to get sector for ${sym}: ${err}` });
      sectorMap.set(sym, 'Unknown');
    }
  }

  // Get current prices for market value calculation
  const priceMap = new Map<string, number>();
  for (const sym of uniqueSymbols) {
    try {
      const quote = await quoteController.getLiveQuote(sym, false);
      priceMap.set(sym, quote.price);
    } catch {
      // Use average price as fallback
      const holding = stockHoldings.find((h) => h.symbol === sym);
      priceMap.set(sym, holding?.averagePrice ?? 0);
    }
  }

  // Aggregate market value by sector
  const sectorValues = new Map<string, number>();
  for (const holding of stockHoldings) {
    const sector = sectorMap.get(holding.symbol) ?? 'Unknown';
    const price = priceMap.get(holding.symbol) ?? holding.averagePrice;
    const value = holding.qty * price;
    sectorValues.set(sector, (sectorValues.get(sector) ?? 0) + value);
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
