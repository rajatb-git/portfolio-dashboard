import moment from 'moment';

// A calendar day with no time is stored at noon UTC, so it reads as the same
// day for a server or browser anywhere from UTC-11 to UTC+11. (Midnight in the
// server's zone showed as the previous day in browsers west of it.)
export const calendarDayToIso = (day: string): string => `${day}T12:00:00.000Z`;

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Trade/event dates arrive from the UI as `YYYY-MM-DD` and from CSV imports in
// assorted formats. Normalize to ISO so they sort against the stored record's createdAt.
export const normalizeTradeDate = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;

  const text = String(value).trim();
  const parsed = moment(DATE_ONLY_RE.test(text) ? calendarDayToIso(text) : text);
  if (!parsed.isValid()) {
    throw new Error(`"${value}" is not a valid date`);
  }
  if (parsed.isAfter(moment(), 'day')) {
    throw new Error('Date cannot be in the future');
  }

  return parsed.toISOString();
};

const MAX_TRADE_QTY = 100_000_000;
const MAX_TRADE_PRICE = 10_000_000;

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
  // Bounds that no real trade reaches, so a slipped key (1,000,000,000 shares)
  // is caught here instead of booking a nine-figure cash overdraft.
  if (qty > MAX_TRADE_QTY) {
    throw new Error(`Quantity can't exceed ${MAX_TRADE_QTY.toLocaleString('en-US')}`);
  }
  const averagePrice = Number(trade.averagePrice);
  if (!Number.isFinite(averagePrice) || averagePrice <= 0) {
    throw new Error('Price must be a positive number');
  }
  if (averagePrice > MAX_TRADE_PRICE) {
    throw new Error(`Price can't exceed $${MAX_TRADE_PRICE.toLocaleString('en-US')}`);
  }
  return { ...trade, symbol, qty: roundQty(qty), averagePrice };
};
