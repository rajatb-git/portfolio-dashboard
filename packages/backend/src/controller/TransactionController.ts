import { IHoldings } from '../models/HoldingsModel';
import { TransactionModel } from '../models/TransactionModel';
import { logger } from '../utils/winston';

const transactionModel = TransactionModel();
transactionModel.initialize();

export const logSellTransaction = async (
  transactionHolding: Partial<IHoldings>,
  pnl?: number
): Promise<void> => {
  try {
    await transactionModel.insertOne({
      accountId: transactionHolding.accountId,
      symbol: transactionHolding.symbol,
      qty: transactionHolding.qty,
      price: transactionHolding.averagePrice,
      type: transactionHolding.type,
      action: 'sell',
      ...(pnl !== undefined && { pnl: +pnl.toFixed(2) }),
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

export const logBuyTransaction = async (transactionHolding: Partial<IHoldings>): Promise<void> => {
  try {
    await transactionModel.insertOne({
      accountId: transactionHolding.accountId,
      symbol: transactionHolding.symbol,
      qty: transactionHolding.qty,
      price: transactionHolding.averagePrice,
      type: transactionHolding.type,
      action: 'buy',
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

export const logDepositTransaction = async (transactionHolding: Partial<IHoldings>): Promise<void> => {
  try {
    await transactionModel.insertOne({
      accountId: transactionHolding.accountId,
      symbol: transactionHolding.symbol,
      qty: transactionHolding.qty,
      price: transactionHolding.averagePrice,
      type: transactionHolding.type,
      action: 'deposit',
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
