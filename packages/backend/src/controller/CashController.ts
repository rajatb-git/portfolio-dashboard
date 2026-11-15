import { AccountModel } from '../models/AccountModel';
import { TransactionModel } from '../models/TransactionModel';
import { logger } from '../utils/winston';

export const transactionCashImpact = (tx: {
  action?: string;
  qty?: number;
  price?: number;
  imported?: boolean;
  cashApplied?: boolean;
}): number => {
  if (tx.imported && !tx.cashApplied) return 0;
  const gross = (tx.qty ?? 0) * (tx.price ?? 0);
  switch (tx.action) {
    case 'sell':
    case 'deposit':
    case 'dividend':
      return gross;
    case 'buy':
    case 'withdraw':
      return -gross;
    default:
      return 0;
  }
};

export const adjustCash = async (accountId: string, delta: number): Promise<number> => {
  const accountsModel = await AccountModel().initialize();
  const account = accountsModel.findById(accountId);
  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }
  const newBalance = +((account.cashBalance ?? 0) + delta).toFixed(2);
  await accountsModel.updateById(accountId, { cashBalance: newBalance });
  return newBalance;
};

export type CashAction = 'deposit' | 'withdraw' | 'dividend';

// A dividend is cash in, stored under the paying symbol so income can be
// totalled per holding.
export const recordCashMovement = async (
  accountId: string,
  amount: number,
  action: CashAction,
  date?: string,
  symbol?: string
): Promise<{ cashBalance: number }> => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be a positive number');
  }
  if (action === 'dividend' && !symbol) {
    throw new Error('A dividend needs the symbol that paid it');
  }

  const delta = action === 'withdraw' ? -amount : amount;
  const cashBalance = await adjustCash(accountId, delta);

  try {
    const transactionModel = await TransactionModel().initialize();
    await transactionModel.insertOne({
      accountId,
      symbol: action === 'dividend' ? (symbol as string) : 'CASH',
      qty: amount,
      price: 1,
      type: 'cash',
      action,
      ...(date && { date }),
    });
  } catch (error: any) {
    logger.log({
      level: 'error',
      label: 'cash transaction',
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
  }

  return { cashBalance };
};
