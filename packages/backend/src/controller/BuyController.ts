import { randomUUID } from 'node:crypto';
import moment from 'moment';
import { AccountModel } from '../models/AccountModel';
import { HoldingsModel, IHoldings, IHoldingsModel, ITaxLot } from '../models/HoldingsModel';
import { TransactionModel } from '../models/TransactionModel';
import { normalizeTrade } from '../utils';
import { adjustCash } from './CashController';
import { resolveLots, totalsFromLots } from './TaxLotController';
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

  const lot: ITaxLot = {
    id: randomUUID(),
    qty: newHolding.qty,
    price: newHolding.averagePrice,
    date: date ?? moment().toISOString(),
  };

  let result: IHoldingsModel;
  if (existingHolding) {
    // Lots are resolved before this buy is logged, so a holding that predates
    // lot tracking is rebuilt from its history without counting this trade twice.
    const txModel = await TransactionModel().initialize();
    const lots = [...resolveLots(existingHolding, txModel.getAllRecords()), lot];
    result = await holdingsModel.updateById(existingHolding.id, { lots, ...totalsFromLots(lots) });
  } else {
    result = await holdingsModel.insertOne({
      accountId: newHolding.accountId,
      name: newHolding.name,
      symbol: newHolding.symbol,
      type: newHolding.type,
      qty: newHolding.qty,
      averagePrice: newHolding.averagePrice,
      lots: [lot],
    });
  }

  await logBuyTransaction(newHolding, date, lot.id);
  await adjustCash(newHolding.accountId, -(newHolding.qty * newHolding.averagePrice));

  return result;
};
