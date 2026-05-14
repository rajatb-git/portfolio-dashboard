import { IHoldings, IHoldingsModel, HoldingsModel } from '../models/HoldingsModel';
import { adjustCash } from './CashController';
import { logSellTransaction } from './TransactionController';

const holdingsModel = HoldingsModel();
holdingsModel.initialize();

export const sell = async (soldHolding: IHoldings): Promise<IHoldingsModel> => {
  const existingHolding = holdingsModel.find({ symbol: soldHolding.symbol, accountId: soldHolding.accountId })[0];

  if (!existingHolding) {
    throw new Error('You do not own this!');
  }
  if (soldHolding.qty > existingHolding.qty) {
    throw new Error('You cannot sell more than you own!');
  }

  const result =
    soldHolding.qty === existingHolding.qty
      ? await holdingsModel.deleteById(existingHolding.id)
      : await holdingsModel.updateById(existingHolding.id, {
          qty: existingHolding.qty - soldHolding.qty,
        });

  await logSellTransaction(soldHolding);
  await adjustCash(soldHolding.accountId, soldHolding.qty * soldHolding.averagePrice);

  return result;
};
