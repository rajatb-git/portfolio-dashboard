import { IHoldings } from '../models/HoldingsModel';
import { ITransactionModel, TransactionModel } from '../models/TransactionModel';
import { logger } from '../utils/winston';

const transactionModel = TransactionModel();
transactionModel.initialize();

export type EnrichedTransaction = ITransactionModel & { pnl?: number };

/**
 * Replays transactions in chronological order to compute realized P/L on sells.
 * Cost basis is a running per-(account, symbol) weighted average; sells don't
 * change the average — only the remaining qty. Buy/cash transactions get no pnl.
 */
export const enrichWithPnl = (transactions: ITransactionModel[]): EnrichedTransaction[] => {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const positions = new Map<string, { qty: number; avgCost: number }>();
  const pnlById = new Map<string, number>();

  for (const t of sorted) {
    if (t.type === 'cash') continue;
    const key = `${t.accountId}::${(t.symbol ?? '').toUpperCase()}`;
    const pos = positions.get(key) ?? { qty: 0, avgCost: 0 };

    if (t.action === 'buy') {
      const totalQty = pos.qty + t.qty;
      const newAvg = totalQty > 0 ? (pos.qty * pos.avgCost + t.qty * (t.price ?? 0)) / totalQty : 0;
      positions.set(key, { qty: totalQty, avgCost: newAvg });
    } else if (t.action === 'sell') {
      pnlById.set(t.id, ((t.price ?? 0) - pos.avgCost) * t.qty);
      const remaining = Math.max(0, pos.qty - t.qty);
      positions.set(key, { qty: remaining, avgCost: remaining > 0 ? pos.avgCost : 0 });
    }
  }

  return transactions.map((t) => {
    const pnl = pnlById.get(t.id);
    return pnl === undefined ? t : { ...t, pnl: +pnl.toFixed(2) };
  });
};

export const logSellTransaction = async (transactionHolding: Partial<IHoldings>): Promise<void> => {
  try {
    await transactionModel.insertOne({
      accountId: transactionHolding.accountId,
      symbol: transactionHolding.symbol,
      qty: transactionHolding.qty,
      price: transactionHolding.averagePrice,
      type: transactionHolding.type,
      action: 'sell',
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
