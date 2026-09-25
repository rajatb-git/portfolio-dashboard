import { AccountModel } from '../models/AccountModel';
import { HoldingsModel, IHoldings, IHoldingsModel } from '../models/HoldingsModel';
import { calulateAveragePriceBuy, normalizeTrade } from '../utils';
import { adjustCash } from './CashController';
import { logBuyTransaction } from './TransactionController';

export const buy = async (trade: IHoldings, date?: string): Promise<IHoldingsModel> => {
  const newHolding = normalizeTrade(trade);
  if (!newHolding.name?.trim()) {
    newHolding.name = newHolding.symbol;
  }

  const accountsModel = await AccountModel().initialize();
  if (!accountsModel.findById(newHolding.accountId)) {
    throw new Error(`Account ${newHolding.accountId} not found`);
  }

  const holdingsModel = await HoldingsModel().initialize();
  const existingHolding = holdingsModel.find({ symbol: newHolding.symbol, accountId: newHolding.accountId })[0];

  let result: IHoldingsModel;
  if (existingHolding) {
    const newAverageValues = calulateAveragePriceBuy(
      existingHolding.qty,
      existingHolding.averagePrice,
      newHolding.qty,
      newHolding.averagePrice
    );

    result = await holdingsModel.updateById(existingHolding.id, {
      ...newAverageValues,
    });
  } else {
    result = await holdingsModel.insertOne(newHolding);
  }

  await logBuyTransaction(newHolding, date);
  await adjustCash(newHolding.accountId, -(newHolding.qty * newHolding.averagePrice));

  return result;
};
