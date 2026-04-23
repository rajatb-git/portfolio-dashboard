import moment from 'moment';

import { getStockDividends } from '../externalApis/finnHub';
import { DividendDBModel, IDividendModel } from '../models/DividendModel';
import { HoldingsModel, IHoldingsModel } from '../models/HoldingsModel';
import { LiveQuoteController } from '../controller/LiveQuoteController';
import { CacheDBModel } from '../models/CacheModel';
import { logger } from '../utils/winston';

const CACHE_KEY_PREFIX = 'dividend_fetch_';
const CACHE_HOURS = 24;

export class DividendController {
  /**
   * Fetch dividends from FinnHub for a symbol and store them.
   * Uses cache model to avoid re-fetching within 24 hours.
   */
  fetchAndStoreDividends = async (symbol: string): Promise<IDividendModel[]> => {
    const cacheModel = await CacheDBModel().initialize();
    const cacheKey = CACHE_KEY_PREFIX + symbol;
    const cached = cacheModel.findById(cacheKey);

    if (cached && moment().diff(moment(cached.updatedAt), 'hours') <= CACHE_HOURS) {
      // Return existing dividends for this symbol from the dividend collection
      const dividendModel = await DividendDBModel().initialize();
      return dividendModel.getAllRecords().filter((d) => d.holdingSymbol === symbol);
    }

    const fromDate = moment().subtract(5, 'years').format('YYYY-MM-DD');
    const toDate = moment().format('YYYY-MM-DD');
    const apiData = await getStockDividends(symbol, fromDate, toDate);

    const dividendModel = await DividendDBModel().initialize();

    // Remove old records for this symbol before inserting fresh data
    const existing = dividendModel.getAllRecords().filter((d) => d.holdingSymbol === symbol);
    for (const rec of existing) {
      await dividendModel.deleteById(rec.id);
    }

    const inserted: IDividendModel[] = [];
    for (const div of apiData) {
      const record = await dividendModel.insertOne({
        holdingSymbol: symbol,
        accountId: '',
        amount: div.amount,
        date: div.date,
        type: 'regular',
        shares: 0,
      });
      inserted.push(record);
    }

    // Update cache timestamp
    await cacheModel.insertOrUpdate({ key: cacheKey, value: moment().toISOString() }, cacheKey);

    return inserted;
  };

  /**
   * Get dividend summary across all holdings.
   * Returns YTD income, projected annual income, yield, and per-holding breakdown.
   */
  getDividendSummary = async (): Promise<{
    ytdIncome: number;
    projectedAnnualIncome: number;
    portfolioYield: number;
    monthlyIncome: number;
    byHolding: Array<{
      symbol: string;
      annualDividend: number;
      yield: number;
      lastPayDate: string;
      currentPrice: number;
    }>;
    monthlyHistory: Array<{ month: string; income: number }>;
  }> => {
    const holdingsModel = await HoldingsModel().initialize();
    const allHoldings = holdingsModel.getAllRecords();
    const quoteController = new LiveQuoteController();

    // Fetch dividends for all unique stock symbols
    const stockHoldings = allHoldings.filter((h) => h.type === 'stock');
    const uniqueSymbols = [...new Set(stockHoldings.map((h) => h.symbol))];

    // Fetch dividend data for each symbol (uses caching)
    const dividendsBySymbol = new Map<string, IDividendModel[]>();
    for (const sym of uniqueSymbols) {
      try {
        const divs = await this.fetchAndStoreDividends(sym);
        dividendsBySymbol.set(sym, divs);
      } catch (err) {
        logger.log({
          level: 'error',
          label: 'DividendController',
          message: `Failed to fetch dividends for ${sym}: ${err}`,
        });
        dividendsBySymbol.set(sym, []);
      }
    }

    const ytdStart = moment().startOf('year');
    let totalYtdIncome = 0;
    let totalAnnualDividend = 0;
    let totalCostBasis = 0;

    const byHolding: Array<{
      symbol: string;
      annualDividend: number;
      yield: number;
      lastPayDate: string;
      currentPrice: number;
    }> = [];

    // Monthly history buckets (last 12 months)
    const monthlyMap = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      monthlyMap.set(moment().subtract(i, 'months').format('YYYY-MM'), 0);
    }

    // Aggregate holdings by symbol (may have same symbol across accounts)
    const holdingsBySymbol = new Map<string, IHoldingsModel[]>();
    for (const h of stockHoldings) {
      const arr = holdingsBySymbol.get(h.symbol) ?? [];
      arr.push(h);
      holdingsBySymbol.set(h.symbol, arr);
    }

    for (const sym of uniqueSymbols) {
      const divs = dividendsBySymbol.get(sym) ?? [];
      const holdings = holdingsBySymbol.get(sym) ?? [];
      const totalShares = holdings.reduce((s, h) => s + h.qty, 0);
      const avgPrice = holdings.reduce((s, h) => s + h.averagePrice * h.qty, 0) / (totalShares || 1);

      // Calculate annual dividend from trailing 12 months
      const oneYearAgo = moment().subtract(1, 'year');
      const trailingDivs = divs.filter((d) => moment(d.date).isAfter(oneYearAgo));
      const annualDivPerShare = trailingDivs.reduce((s, d) => s + d.amount, 0);
      const annualDividend = +(annualDivPerShare * totalShares).toFixed(2);

      // YTD income
      const ytdDivs = divs.filter((d) => moment(d.date).isAfter(ytdStart));
      const ytdIncome = +(ytdDivs.reduce((s, d) => s + d.amount, 0) * totalShares).toFixed(2);
      totalYtdIncome += ytdIncome;
      totalAnnualDividend += annualDividend;
      totalCostBasis += avgPrice * totalShares;

      // Monthly history
      for (const d of divs) {
        const monthKey = moment(d.date).format('YYYY-MM');
        if (monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + d.amount * totalShares);
        }
      }

      // Get current price for yield calc
      let currentPrice = avgPrice;
      try {
        const quote = await quoteController.getLiveQuote(sym, false);
        currentPrice = quote.price;
      } catch {
        // use avg price as fallback
      }

      const holdingYield = currentPrice > 0 ? +((annualDivPerShare / currentPrice) * 100).toFixed(2) : 0;
      const lastPayDate = divs.length > 0 ? [...divs].sort((a, b) => b.date.localeCompare(a.date))[0].date : '';

      if (annualDivPerShare > 0) {
        byHolding.push({
          symbol: sym,
          annualDividend,
          yield: holdingYield,
          lastPayDate,
          currentPrice: +currentPrice.toFixed(2),
        });
      }
    }

    const portfolioYield = totalCostBasis > 0 ? +((totalAnnualDividend / totalCostBasis) * 100).toFixed(2) : 0;

    const monthlyHistory = [...monthlyMap.entries()].map(([month, income]) => ({
      month,
      income: +income.toFixed(2),
    }));

    return {
      ytdIncome: +totalYtdIncome.toFixed(2),
      projectedAnnualIncome: +totalAnnualDividend.toFixed(2),
      portfolioYield,
      monthlyIncome: +(totalAnnualDividend / 12).toFixed(2),
      byHolding: byHolding.sort((a, b) => b.annualDividend - a.annualDividend),
      monthlyHistory,
    };
  };
}
