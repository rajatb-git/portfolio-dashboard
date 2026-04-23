import { IHoldings, IHoldingsModel, HoldingsModel } from '../models/HoldingsModel';
import { logSellTransaction } from './TransactionController';

const holdingsModel = HoldingsModel();
holdingsModel.initialize();

export const sell = (soldHolding: IHoldings): Promise<IHoldingsModel> => {
  const existingHolding = holdingsModel.find({ symbol: soldHolding.symbol, accountId: soldHolding.accountId })[0];

  if (existingHolding) {
    if (soldHolding.qty > existingHolding.qty) {
      throw new Error('You cannot sell more than you own!');
    }

    if (soldHolding.qty === existingHolding.qty) {
      logSellTransaction(soldHolding);

      return holdingsModel.deleteById(existingHolding.id);
    }

    logSellTransaction(soldHolding);

    return holdingsModel.updateById(existingHolding.id, {
      qty: existingHolding.qty - soldHolding.qty,
    });
  } else {
    throw new Error('You do not own this!');
  }
};
