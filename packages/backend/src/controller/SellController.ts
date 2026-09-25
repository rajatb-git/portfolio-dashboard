import { AccountModel } from '../models/AccountModel';
import { IHoldings, IHoldingsModel, HoldingsModel } from '../models/HoldingsModel';
import { normalizeTrade, roundQty } from '../utils';
import { adjustCash } from './CashController';
import { logSellTransaction } from './TransactionController';

export const sell = async (trade: IHoldings, date?: string): Promise<IHoldingsModel> => {
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
  const remainingQty = roundQty(existingHolding.qty - soldHolding.qty);
  if (remainingQty < 0) {
    throw new Error('You cannot sell more than you own!');
  }
  if (!soldHolding.name?.trim()) {
    soldHolding.name = existingHolding.name;
  }
  soldHolding.type = existingHolding.type;

  const result =
    remainingQty === 0
      ? await holdingsModel.deleteById(existingHolding.id)
      : await holdingsModel.updateById(existingHolding.id, { qty: remainingQty });

  const pnl = (soldHolding.averagePrice - existingHolding.averagePrice) * soldHolding.qty;

  await logSellTransaction(soldHolding, pnl, date);
  await adjustCash(soldHolding.accountId, soldHolding.qty * soldHolding.averagePrice);

  return result;
};
