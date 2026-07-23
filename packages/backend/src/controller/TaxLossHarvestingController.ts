import moment from 'moment';
import { TransactionModel } from '../models/TransactionModel';
import { createDashboard } from './DashboardController';

export type HarvestCandidate = {
  symbol: string;
  name: string;
  accountId: string;
  type: 'stock' | 'crypto';
  qty: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedLoss: number; // positive dollar magnitude of the loss
  lossPercent: number; // negative
  term: 'short' | 'long';
  // Crypto is not subject to the US wash-sale rule, so it is never flagged.
  washSaleRisk: boolean;
  washSaleClearDate: string | null; // when a fresh buy stops tainting a harvested loss
};

export type TaxLossHarvestingResult = {
  candidates: HarvestCandidate[];
  totalUnrealizedLoss: number; // sum across all candidates
  harvestableNow: number; // sum excluding wash-sale-risk positions
  shortTermLoss: number;
  longTermLoss: number;
};

const WASH_SALE_DAYS = 30;

// Imported rows carry `date`; otherwise fall back to the insert timestamp.
const effectiveDate = (t: { date?: string; createdAt?: string }): string =>
  t.date || t.createdAt || moment().toISOString();

export const findTaxLossHarvesting = async (): Promise<TaxLossHarvestingResult> => {
  const [holdings, txModel] = await Promise.all([createDashboard(), TransactionModel().initialize()]);
  const transactions = txModel.getAllRecords();

  // Earliest buy (holding-period start) and most recent buy (wash-sale window)
  // per symbol+account, from recorded buy history.
  const earliestBuy = new Map<string, string>();
  const latestBuy = new Map<string, string>();
  for (const t of transactions) {
    if (t.action !== 'buy' || !t.symbol) continue;
    const key = `${t.accountId}:${t.symbol.toUpperCase()}`;
    const date = effectiveDate(t);
    const prevEarliest = earliestBuy.get(key);
    if (!prevEarliest || date < prevEarliest) earliestBuy.set(key, date);
    const prevLatest = latestBuy.get(key);
    if (!prevLatest || date > prevLatest) latestBuy.set(key, date);
  }

  const now = moment();
  const candidates: HarvestCandidate[] = [];

  for (const h of holdings) {
    if (h.totalGL >= 0) continue;

    const key = `${h.accountId}:${h.symbol.toUpperCase()}`;
    const firstBuy = earliestBuy.get(key);
    const term: 'short' | 'long' = firstBuy && now.diff(moment(firstBuy), 'days') > 365 ? 'long' : 'short';

    const recentBuy = latestBuy.get(key);
    const washSaleRisk = h.type === 'stock' && !!recentBuy && now.diff(moment(recentBuy), 'days') < WASH_SALE_DAYS;
    const washSaleClearDate =
      washSaleRisk && recentBuy
        ? moment(recentBuy)
            .add(WASH_SALE_DAYS + 1, 'days')
            .format('YYYY-MM-DD')
        : null;

    candidates.push({
      symbol: h.symbol,
      name: h.name,
      accountId: h.accountId,
      type: h.type,
      qty: h.qty,
      averagePrice: h.averagePrice,
      currentPrice: h.currentPrice,
      marketValue: h.marketValue,
      unrealizedLoss: +Math.abs(h.totalGL).toFixed(2),
      lossPercent: h.totalGLPercent,
      term,
      washSaleRisk,
      washSaleClearDate,
    });
  }

  candidates.sort((a, b) => b.unrealizedLoss - a.unrealizedLoss);

  const totalUnrealizedLoss = +candidates.reduce((s, c) => s + c.unrealizedLoss, 0).toFixed(2);
  const harvestableNow = +candidates
    .filter((c) => !c.washSaleRisk)
    .reduce((s, c) => s + c.unrealizedLoss, 0)
    .toFixed(2);
  const shortTermLoss = +candidates
    .filter((c) => c.term === 'short')
    .reduce((s, c) => s + c.unrealizedLoss, 0)
    .toFixed(2);
  const longTermLoss = +candidates
    .filter((c) => c.term === 'long')
    .reduce((s, c) => s + c.unrealizedLoss, 0)
    .toFixed(2);

  return { candidates, totalUnrealizedLoss, harvestableNow, shortTermLoss, longTermLoss };
};
