import moment from 'moment';

// Trade/event dates arrive from the UI as `YYYY-MM-DD` and from CSV imports in
// assorted formats. Normalize to ISO so they sort against the stored record's createdAt.
export const normalizeTradeDate = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;

  const parsed = moment(String(value));
  if (!parsed.isValid()) {
    throw new Error(`"${value}" is not a valid date`);
  }
  if (parsed.isAfter(moment(), 'day')) {
    throw new Error('Date cannot be in the future');
  }

  return parsed.toISOString();
};

export const calulateAveragePriceBuy = (
  qty1: number,
  avgPrice1: number,
  qty2: number,
  avgPrice2: number
): { qty: number; averagePrice: number } => {
  let totalQty = 0,
    averagePrice = 0;

  totalQty = roundQty(qty1 + qty2);

  const totalInvestment = qty1 * avgPrice1 + qty2 * avgPrice2;

  averagePrice = totalInvestment / totalQty;

  return { qty: totalQty, averagePrice };
};

// Crypto trades are fractional; rounding stops float residue (0.1 + 0.2) from leaving dust positions behind.
export const roundQty = (qty: number): number => +qty.toFixed(8);

export const normalizeTrade = <T extends { symbol: string; qty: number; averagePrice: number }>(trade: T): T => {
  const symbol = typeof trade.symbol === 'string' ? trade.symbol.trim().toUpperCase() : '';
  if (!symbol) {
    throw new Error('Symbol is required');
  }
  const qty = Number(trade.qty);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Quantity must be a positive number');
  }
  const averagePrice = Number(trade.averagePrice);
  if (!Number.isFinite(averagePrice) || averagePrice < 0) {
    throw new Error('Price must be zero or a positive number');
  }
  return { ...trade, symbol, qty: roundQty(qty), averagePrice };
};
