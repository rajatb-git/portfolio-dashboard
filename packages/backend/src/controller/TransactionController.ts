import { HoldingsModel, IHoldings } from '../models/HoldingsModel';
import { IRelievedLot, ITransactionModel, TransactionModel } from '../models/TransactionModel';
import { logger } from '../utils/winston';
import { resolveLots, totalsFromLots } from './TaxLotController';

export const logSellTransaction = async (
  transactionHolding: Partial<IHoldings>,
  pnl?: number,
  date?: string,
  lots?: IRelievedLot[]
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
      ...(lots?.length && { lots }),
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

export const logBuyTransaction = async (
  transactionHolding: Partial<IHoldings>,
  date?: string,
  lotId?: string
): Promise<void> => {
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
      ...(lotId && { lotId }),
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

// An imported trade that carries no lot never moved a holding, so there is
// nothing to undo or keep in step when it is edited or deleted.
const isRecordOnly = (tx: ITransactionModel): boolean => !!tx.imported && !tx.lotId && !tx.lots?.length;

const tradeHolding = async (tx: ITransactionModel) => {
  const holdingsModel = await HoldingsModel().initialize();
  const symbol = (tx.symbol ?? '').toUpperCase();
  const holding = holdingsModel
    .getAllRecords()
    .find((h) => h.accountId === tx.accountId && (h.symbol ?? '').toUpperCase() === symbol);
  return { holdingsModel, holding, symbol };
};

// Undoes a trade's effect on its holding before the trade is deleted, using the
// lot each buy opened and the lots each sell relieved. Cash is the caller's
// job. Refuses rather than guessing when the lots have moved on since: a buy
// whose shares were later sold, or a trade logged before lots were tracked.
export const reverseTrade = async (tx: ITransactionModel): Promise<void> => {
  if (isRecordOnly(tx) || (tx.action !== 'buy' && tx.action !== 'sell')) return;
  const { holdingsModel, holding, symbol } = await tradeHolding(tx);
  const txModel = await TransactionModel().initialize();
  const lots = holding ? resolveLots(holding, txModel.getAllRecords()) : [];

  if (tx.action === 'buy') {
    if (!tx.lotId) {
      throw new Error(
        `This buy was recorded before tax lots were tracked, so it can't be undone automatically — adjust the ${symbol} lots on its Research page instead`
      );
    }
    const lot = lots.find((l) => l.id === tx.lotId);
    if (!holding || !lot || Math.abs(lot.qty - tx.qty) > 1e-9) {
      throw new Error(
        `Some of the ${symbol} shares from this buy have been sold or edited since — delete those sells or fix the lots first`
      );
    }
    const remaining = lots.filter((l) => l.id !== tx.lotId);
    if (remaining.length) await holdingsModel.updateById(holding.id, { lots: remaining, ...totalsFromLots(remaining) });
    else await holdingsModel.deleteById(holding.id);
    return;
  }

  if (!tx.lots?.length) {
    throw new Error(
      `This sell was recorded before tax lots were tracked, so it can't be undone automatically — adjust the ${symbol} lots on its Research page instead`
    );
  }
  const restored = lots.map((l) => ({ ...l }));
  for (const relieved of tx.lots) {
    const existing = restored.find((l) => l.id === relieved.lotId);
    if (existing) existing.qty = +(existing.qty + relieved.qty).toFixed(8);
    else restored.push({ id: relieved.lotId, qty: relieved.qty, price: relieved.price, date: relieved.date });
  }
  if (holding) {
    await holdingsModel.updateById(holding.id, { lots: restored, ...totalsFromLots(restored) });
  } else {
    await holdingsModel.insertOne({
      accountId: tx.accountId,
      name: symbol,
      symbol,
      type: tx.type,
      lots: restored,
      ...totalsFromLots(restored),
    });
  }
};

// A trade's quantity, price, account and symbol are baked into its lots and
// cash, so only its date may be corrected in place; anything else is a delete
// and re-record. A corrected buy date moves its lot's holding period with it.
export const applyTradeEdit = async (previous: ITransactionModel, next: Partial<ITransactionModel>): Promise<void> => {
  if (isRecordOnly(previous) || (previous.action !== 'buy' && previous.action !== 'sell')) return;
  const locked = ['qty', 'price', 'accountId', 'symbol', 'action', 'type'] as const;
  const changed = locked.filter((key) => next[key] !== undefined && String(next[key]) !== String(previous[key]));
  if (changed.length) {
    throw new Error(
      `A trade's ${changed.join(', ')} can't be edited in place — delete it and record it again so shares, lots and cash stay in step`
    );
  }
  if (previous.action === 'buy' && previous.lotId && next.date && next.date !== previous.date) {
    const { holdingsModel, holding } = await tradeHolding(previous);
    const lots = holding?.lots ?? [];
    if (holding && lots.some((l) => l.id === previous.lotId)) {
      const updated = lots.map((l) => (l.id === previous.lotId ? { ...l, date: next.date as string } : l));
      await holdingsModel.updateById(holding.id, { lots: updated });
    }
  }
};
