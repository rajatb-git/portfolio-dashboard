import { IHoldings, IHoldingsModel, HoldingsModel } from '../models/HoldingsModel';
import { calulateAveragePriceBuy } from '../utils';
import { logBuyTransaction } from './TransactionController';

const holdingsModel = HoldingsModel();
holdingsModel.initialize();

export const buy = async (newHolding: IHoldings): Promise<IHoldingsModel> => {
  const existingHolding = holdingsModel.find({ symbol: newHolding.symbol, accountId: newHolding.accountId })[0];

  if (existingHolding) {
    const newAverageValues = calulateAveragePriceBuy(
      existingHolding.qty,
      existingHolding.averagePrice,
      newHolding.qty,
      newHolding.averagePrice
    );

    const result = await holdingsModel.updateById(existingHolding.id, {
      ...newAverageValues,
      ...(newHolding.targetPrice && { targetPrice: newHolding.targetPrice }),
    });

    if (!(result instanceof Error)) {
      logBuyTransaction(newHolding);
    }

    return result;
  } else {
    const result = await holdingsModel.insertOne(newHolding);

    if (!(result instanceof Error)) {
      logBuyTransaction(newHolding);
    }

    return result;
  }
};
