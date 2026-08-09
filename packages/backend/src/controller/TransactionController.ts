import { IHoldings } from '../models/HoldingsModel';
import { TransactionModel } from '../models/TransactionModel';
import { logger } from '../utils/winston';

export const logSellTransaction = async (
  transactionHolding: Partial<IHoldings>,
  pnl?: number,
  date?: string
): Promise<void> => {
  try {
    const transactionModel = await TransactionModel().initialize();
    await transactionModel.insertOne({
      accountId: transactionHolding.accountId,
      symbol: transactionHolding.symbol,
      qty: transactionHolding.qty,
      price: transactionHolding.averagePrice,
      type: transactionHolding.type,
      action: 'sell',
      ...(pnl !== undefined && { pnl: +pnl.toFixed(2) }),
      ...(date && { date }),
    });
  } catch (error: any) {
    logger.log({
      level: 'error',
      label: 'sell',
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
  }
};

export const logBuyTransaction = async (transactionHolding: Partial<IHoldings>, date?: string): Promise<void> => {
  try {
    const transactionModel = await TransactionModel().initialize();
    await transactionModel.insertOne({
      accountId: transactionHolding.accountId,
      symbol: transactionHolding.symbol,
      qty: transactionHolding.qty,
      price: transactionHolding.averagePrice,
      type: transactionHolding.type,
      action: 'buy',
      ...(date && { date }),
    });
  } catch (error: any) {
    logger.log({
      level: 'error',
      label: 'buy',
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
  }
};
