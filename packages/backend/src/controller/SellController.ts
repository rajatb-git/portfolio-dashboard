import moment from 'moment';
import { AccountModel } from '../models/AccountModel';
import { IHoldings, IHoldingsModel, HoldingsModel } from '../models/HoldingsModel';
import { getTaxConfig } from '../models/TaxConfigModel';
import { TransactionModel } from '../models/TransactionModel';
import { normalizeTrade } from '../utils';
import { adjustCash } from './CashController';
import { LotMethod, resolveLots, selectLots, totalsFromLots } from './TaxLotController';
import { logSellTransaction } from './TransactionController';

export type SellOptions = { lotMethod?: LotMethod; lotIds?: string[] };

export const sell = async (trade: IHoldings, date?: string, options: SellOptions = {}): Promise<IHoldingsModel> => {
  const soldHolding = normalizeTrade(trade);

  const accountsModel = await AccountModel().initialize();
  if (!accountsModel.findById(soldHolding.accountId)) {
    throw new Error(`Account ${soldHolding.accountId} not found`);
  }

  const holdingsModel = await HoldingsModel().initialize();
  const existingHolding = holdingsModel.find({ symbol: soldHolding.symbol, accountId: soldHolding.accountId })[0];

  if (!existingHolding) {
    throw new Error('You do not own this!');
  }
  if (soldHolding.qty > existingHolding.qty) {
    throw new Error('You cannot sell more than you own!');
  }
  if (!soldHolding.name?.trim()) {
    soldHolding.name = existingHolding.name;
  }
  soldHolding.type = existingHolding.type;

  const [txModel, config] = await Promise.all([TransactionModel().initialize(), getTaxConfig()]);
  const lots = resolveLots(existingHolding, txModel.getAllRecords());
  const { relieved, remaining } = selectLots(lots, soldHolding.qty, options.lotMethod ?? 'fifo', {
    salePrice: soldHolding.averagePrice,
    saleDate: date ?? moment(),
    config,
    lotIds: options.lotIds,
  });

  const result = remaining.length
    ? await holdingsModel.updateById(existingHolding.id, { lots: remaining, ...totalsFromLots(remaining) })
    : await holdingsModel.deleteById(existingHolding.id);

  const pnl = relieved.reduce((sum, r) => sum + (soldHolding.averagePrice - r.lot.price) * r.qty, 0);

  await logSellTransaction(
    soldHolding,
    pnl,
    date,
    relieved.map((r) => ({ lotId: r.lot.id, qty: r.qty, price: r.lot.price, date: r.lot.date }))
  );
  await adjustCash(soldHolding.accountId, soldHolding.qty * soldHolding.averagePrice);

  return result;
};
