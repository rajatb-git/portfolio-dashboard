export interface ITransaction {
  id: string;
  accountId: string;
  symbol: string;
  qty: number;
  price: number;
  type: 'stock' | 'crypto' | 'cash';
  action: string;
  createdAt: string;
  updatedAt?: string;
  pnl?: number;
  // Original trade date for rows brought in via CSV import (createdAt is the import time).
  date?: string;
  // Buys: the tax lot opened. Sells: the lots relieved.
  lotId?: string;
  lots?: Array<{ lotId: string; qty: number; price: number; date: string }>;
}
