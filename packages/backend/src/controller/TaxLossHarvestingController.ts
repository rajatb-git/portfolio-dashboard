import moment from 'moment';
import { roundQty } from '../utils';
import { enrichLots, loadPositionsWithLots } from './TaxLotController';

export type HarvestCandidate = {
  symbol: string;
  name: string;
  accountId: string;
  type: 'stock' | 'crypto';
  qty: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  // Shares in the lots trading below cost — selling just those lots harvests
  // the loss even when the position as a whole is up.
  harvestQty: number;
  unrealizedLoss: number; // positive dollar magnitude of the loss across losing lots
  lossPercent: number; // negative, relative to the losing lots' cost
  shortTermLoss: number;
  longTermLoss: number;
  term: 'short' | 'long' | 'mixed';
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

const round2 = (n: number) => +n.toFixed(2);

export const findTaxLossHarvesting = async (): Promise<TaxLossHarvestingResult> => {
  const { positions } = await loadPositionsWithLots();

  // The wash-sale rule looks across every account, so the most recent purchase
  // of a symbol anywhere taints a loss harvested in any of them.
  const latestPurchase = new Map<string, string>();
  for (const { holding, lots } of positions) {
    const symbol = holding.symbol.toUpperCase();
    for (const lot of lots) {
      if (lot.estimated) continue;
      const prev = latestPurchase.get(symbol);
      if (!prev || lot.date > prev) latestPurchase.set(symbol, lot.date);
    }
  }

  const now = moment();
  const candidates: HarvestCandidate[] = [];

  for (const { holding, lots, currentPrice } of positions) {
    if (currentPrice === null) continue;
    const losing = enrichLots(lots, currentPrice, now).filter((l) => l.gain < 0);
    if (!losing.length) continue;

    const shortTermLoss = round2(-losing.filter((l) => l.term === 'short').reduce((s, l) => s + l.gain, 0));
    const longTermLoss = round2(-losing.filter((l) => l.term === 'long').reduce((s, l) => s + l.gain, 0));
    const unrealizedLoss = round2(shortTermLoss + longTermLoss);
    const losingCost = losing.reduce((s, l) => s + l.costBasis, 0);

    const recentBuy = latestPurchase.get(holding.symbol.toUpperCase());
    const washSaleRisk =
      holding.type === 'stock' && !!recentBuy && now.diff(moment(recentBuy), 'days') < WASH_SALE_DAYS;

    candidates.push({
      symbol: holding.symbol,
      name: holding.name,
      accountId: holding.accountId,
      type: holding.type,
      qty: holding.qty,
      averagePrice: holding.averagePrice,
      currentPrice,
      marketValue: round2(holding.qty * currentPrice),
      harvestQty: roundQty(losing.reduce((s, l) => s + l.qty, 0)),
      unrealizedLoss,
      lossPercent: losingCost ? round2((-unrealizedLoss / losingCost) * 100) : 0,
      shortTermLoss,
      longTermLoss,
      term: shortTermLoss && longTermLoss ? 'mixed' : longTermLoss ? 'long' : 'short',
      washSaleRisk,
      washSaleClearDate:
        washSaleRisk && recentBuy
          ? moment(recentBuy)
              .add(WASH_SALE_DAYS + 1, 'days')
              .format('YYYY-MM-DD')
          : null,
    });
  }

  candidates.sort((a, b) => b.unrealizedLoss - a.unrealizedLoss);

  const sum = (list: HarvestCandidate[], pick: (c: HarvestCandidate) => number) =>
    round2(list.reduce((s, c) => s + pick(c), 0));

  return {
    candidates,
    totalUnrealizedLoss: sum(candidates, (c) => c.unrealizedLoss),
    harvestableNow: sum(
      candidates.filter((c) => !c.washSaleRisk),
      (c) => c.unrealizedLoss
    ),
    shortTermLoss: sum(candidates, (c) => c.shortTermLoss),
    longTermLoss: sum(candidates, (c) => c.longTermLoss),
  };
};
