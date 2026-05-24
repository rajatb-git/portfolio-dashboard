import { HoldingsModel, IHoldings, IHoldingsModel } from '../models/HoldingsModel';
import { calulateAveragePriceBuy } from '../utils';
import { adjustCash } from './CashController';
import { logBuyTransaction } from './TransactionController';

const holdingsModel = HoldingsModel();
holdingsModel.initialize();

export const buy = async (newHolding: IHoldings): Promise<IHoldingsModel> => {
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
      ...(newHolding.targetPrice && { targetPrice: newHolding.targetPrice }),
    });
  } else {
    result = await holdingsModel.insertOne(newHolding);
  }

  await logBuyTransaction(newHolding);
  await adjustCash(newHolding.accountId, -(newHolding.qty * newHolding.averagePrice));

  return result;
};
