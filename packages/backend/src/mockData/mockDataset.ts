import moment from 'moment';

import type { IAlert } from '../models/AlertModel';
import type { IHoldings } from '../models/HoldingsModel';
import type { IPortfolioSnapshot } from '../models/PortfolioSnapshotModel';
import type { ITransaction } from '../models/TransactionModel';

type AssetType = 'stock' | 'crypto';

type SeedAccount = { id: string; name: string };

type DepositEvent = { accountId: string; kind: 'deposit'; amount: number; daysAgo: number };
type TradeEvent = {
  accountId: string;
  kind: 'buy' | 'sell';
  symbol: string;
  name: string;
  assetType: AssetType;
  qty: number;
  price: number;
  daysAgo: number;
};
type SeedEvent = DepositEvent | TradeEvent;

// Four accounts spanning taxable, retirement and crypto, so the demo
// exercises account grouping, allocation-by-type and risk analytics.
const ACCOUNTS: SeedAccount[] = [
  { id: 'brokerage-demo', name: 'Brokerage' },
  { id: 'roth-ira-demo', name: 'Roth IRA' },
  { id: '401k-demo', name: '401(k)' },
  { id: 'crypto-wallet-demo', name: 'Crypto Wallet' },
];

// A chronological trade log per account (oldest first within each account).
// `daysAgo` is relative to seed time rather than a fixed calendar date, so
// the demo always looks current no matter when it's turned on. Replayed
// through the same average-cost/cash-impact math the app itself uses (see
// buildMockDataset below) rather than hand-computing resulting positions,
// so the seeded accounts/holdings/transactions can never drift out of sync.
const EVENTS: SeedEvent[] = [
  // Brokerage — taxable, individual growth names
  { accountId: 'brokerage-demo', kind: 'deposit', amount: 50000, daysAgo: 330 },
  {
    accountId: 'brokerage-demo',
    kind: 'buy',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetType: 'stock',
    qty: 40,
    price: 222.5,
    daysAgo: 327,
  },
  {
    accountId: 'brokerage-demo',
    kind: 'buy',
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    assetType: 'stock',
    qty: 15,
    price: 415.0,
    daysAgo: 323,
  },
  {
    accountId: 'brokerage-demo',
    kind: 'buy',
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    assetType: 'stock',
    qty: 60,
    price: 128.0,
    daysAgo: 310,
  },
  { accountId: 'brokerage-demo', kind: 'deposit', amount: 15000, daysAgo: 285 },
  {
    accountId: 'brokerage-demo',
    kind: 'buy',
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    assetType: 'stock',
    qty: 30,
    price: 186.75,
    daysAgo: 283,
  },
  {
    accountId: 'brokerage-demo',
    kind: 'buy',
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    assetType: 'stock',
    qty: 20,
    price: 312.4,
    daysAgo: 268,
  },
  {
    accountId: 'brokerage-demo',
    kind: 'buy',
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    assetType: 'stock',
    qty: 20,
    price: 142.1,
    daysAgo: 210,
  },
  {
    accountId: 'brokerage-demo',
    kind: 'sell',
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    assetType: 'stock',
    qty: 25,
    price: 168.3,
    daysAgo: 150,
  },
  { accountId: 'brokerage-demo', kind: 'deposit', amount: 8000, daysAgo: 130 },
  {
    accountId: 'brokerage-demo',
    kind: 'buy',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetType: 'stock',
    qty: 15,
    price: 238.9,
    daysAgo: 124,
  },
  {
    accountId: 'brokerage-demo',
    kind: 'buy',
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    assetType: 'stock',
    qty: 10,
    price: 201.2,
    daysAgo: 56,
  },

  // Roth IRA — index + dividend ETFs, one growth name
  { accountId: 'roth-ira-demo', kind: 'deposit', amount: 20000, daysAgo: 312 },
  {
    accountId: 'roth-ira-demo',
    kind: 'buy',
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    assetType: 'stock',
    qty: 20,
    price: 545.0,
    daysAgo: 310,
  },
  {
    accountId: 'roth-ira-demo',
    kind: 'buy',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    assetType: 'stock',
    qty: 25,
    price: 172.3,
    daysAgo: 298,
  },
  { accountId: 'roth-ira-demo', kind: 'deposit', amount: 6000, daysAgo: 215 },
  {
    accountId: 'roth-ira-demo',
    kind: 'buy',
    symbol: 'SCHD',
    name: 'Schwab US Dividend Equity ETF',
    assetType: 'stock',
    qty: 150,
    price: 27.8,
    daysAgo: 212,
  },
  {
    accountId: 'roth-ira-demo',
    kind: 'buy',
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    assetType: 'stock',
    qty: 5,
    price: 561.2,
    daysAgo: 98,
  },

  // 401(k) — broad market + bonds
  { accountId: '401k-demo', kind: 'deposit', amount: 16000, daysAgo: 314 },
  {
    accountId: '401k-demo',
    kind: 'buy',
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    assetType: 'stock',
    qty: 30,
    price: 288.5,
    daysAgo: 311,
  },
  {
    accountId: '401k-demo',
    kind: 'buy',
    symbol: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    assetType: 'stock',
    qty: 80,
    price: 72.9,
    daysAgo: 311,
  },
  { accountId: '401k-demo', kind: 'deposit', amount: 4500, daysAgo: 175 },
  {
    accountId: '401k-demo',
    kind: 'buy',
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    assetType: 'stock',
    qty: 12,
    price: 301.75,
    daysAgo: 173,
  },
  {
    accountId: '401k-demo',
    kind: 'buy',
    symbol: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    assetType: 'stock',
    qty: 30,
    price: 73.4,
    daysAgo: 173,
  },

  // Crypto Wallet
  { accountId: 'crypto-wallet-demo', kind: 'deposit', amount: 30000, daysAgo: 300 },
  {
    accountId: 'crypto-wallet-demo',
    kind: 'buy',
    symbol: 'BTC',
    name: 'Bitcoin',
    assetType: 'crypto',
    qty: 0.15,
    price: 96500,
    daysAgo: 298,
  },
  {
    accountId: 'crypto-wallet-demo',
    kind: 'buy',
    symbol: 'ETH',
    name: 'Ethereum',
    assetType: 'crypto',
    qty: 3,
    price: 3380,
    daysAgo: 298,
  },
  { accountId: 'crypto-wallet-demo', kind: 'deposit', amount: 10000, daysAgo: 188 },
  {
    accountId: 'crypto-wallet-demo',
    kind: 'buy',
    symbol: 'SOL',
    name: 'Solana',
    assetType: 'crypto',
    qty: 40,
    price: 175.5,
    daysAgo: 186,
  },
  {
    accountId: 'crypto-wallet-demo',
    kind: 'buy',
    symbol: 'BTC',
    name: 'Bitcoin',
    assetType: 'crypto',
    qty: 0.05,
    price: 102300,
    daysAgo: 141,
  },
  {
    accountId: 'crypto-wallet-demo',
    kind: 'sell',
    symbol: 'ETH',
    name: 'Ethereum',
    assetType: 'crypto',
    qty: 1,
    price: 3750,
    daysAgo: 78,
  },
];

const ALERTS: IAlert[] = [
  { symbol: 'AAPL', type: 'stock', targetPrice: 250, direction: 'above', note: 'Trim target' },
  { symbol: 'NVDA', type: 'stock', targetPrice: 180, direction: 'above', note: 'Consider trimming further' },
  { symbol: 'BTC', type: 'crypto', targetPrice: 85000, direction: 'below', note: 'Buy the dip' },
  { symbol: 'TSLA', type: 'stock', targetPrice: 320, direction: 'above', note: 'Reassess position size' },
];

const round2 = (n: number): number => Math.round(n * 100) / 100;
const roundQty = (n: number): number => Math.round(n * 1e6) / 1e6;

const dateForDaysAgo = (daysAgo: number): string =>
  moment().subtract(daysAgo, 'days').set({ hour: 14, minute: 30, second: 0, millisecond: 0 }).toISOString();

// Small deterministic PRNG (mulberry32) so "Reset Demo Data" always
// regenerates the exact same performance history rather than a new one.
const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type MockDataset = {
  accounts: Array<{ id: string; name: string; cashBalance: number }>;
  holdings: IHoldings[];
  transactions: ITransaction[];
  alerts: IAlert[];
  snapshots: Array<IPortfolioSnapshot & { id: string }>;
};

const buildSnapshots = (): Array<IPortfolioSnapshot & { id: string }> => {
  const deposits = EVENTS.filter((e): e is DepositEvent => e.kind === 'deposit');
  const startDaysAgo = Math.max(...EVENTS.map((e) => e.daysAgo));
  const rand = mulberry32(20260809);

  const snapshots: Array<IPortfolioSnapshot & { id: string }> = [];
  for (let d = startDaysAgo; d >= 1; d--) {
    const invested = deposits.filter((e) => e.daysAgo >= d).reduce((sum, e) => sum + e.amount, 0);
    if (invested <= 0) continue;

    const progress = 1 - d / startDaysAgo;
    const drift = 1 + 0.16 * progress;
    const noise = 1 + (rand() - 0.5) * 0.024;
    const totalValue = round2(invested * drift * noise);

    const timestamp = dateForDaysAgo(d);
    snapshots.push({ id: timestamp, timestamp, date: timestamp.slice(0, 10), totalValue });
  }
  return snapshots;
};

export const buildMockDataset = (): MockDataset => {
  const cash = new Map<string, number>(ACCOUNTS.map((a) => [a.id, 0]));
  const positions = new Map<string, { name: string; assetType: AssetType; qty: number; averagePrice: number }>();
  const transactions: ITransaction[] = [];

  const sorted = [...EVENTS].sort((a, b) => b.daysAgo - a.daysAgo);

  for (const event of sorted) {
    if (event.kind === 'deposit') {
      cash.set(event.accountId, round2((cash.get(event.accountId) ?? 0) + event.amount));
      transactions.push({
        accountId: event.accountId,
        symbol: 'CASH',
        qty: event.amount,
        price: 1,
        type: 'cash',
        action: 'deposit',
        date: dateForDaysAgo(event.daysAgo),
      });
      continue;
    }

    const key = `${event.accountId}|${event.symbol}`;
    if (event.kind === 'buy') {
      const existing = positions.get(key);
      const nextQty = roundQty((existing?.qty ?? 0) + event.qty);
      const nextAvg = existing
        ? (existing.qty * existing.averagePrice + event.qty * event.price) / nextQty
        : event.price;
      positions.set(key, { name: event.name, assetType: event.assetType, qty: nextQty, averagePrice: nextAvg });
      cash.set(event.accountId, round2((cash.get(event.accountId) ?? 0) - event.qty * event.price));
      transactions.push({
        accountId: event.accountId,
        symbol: event.symbol,
        qty: event.qty,
        price: event.price,
        type: event.assetType,
        action: 'buy',
        date: dateForDaysAgo(event.daysAgo),
      });
    } else {
      const existing = positions.get(key);
      if (!existing) throw new Error(`Mock dataset error: selling ${event.symbol} with no prior position`);
      const pnl = round2((event.price - existing.averagePrice) * event.qty);
      positions.set(key, { ...existing, qty: roundQty(existing.qty - event.qty) });
      cash.set(event.accountId, round2((cash.get(event.accountId) ?? 0) + event.qty * event.price));
      transactions.push({
        accountId: event.accountId,
        symbol: event.symbol,
        qty: event.qty,
        price: event.price,
        type: event.assetType,
        action: 'sell',
        pnl,
        date: dateForDaysAgo(event.daysAgo),
      });
    }
  }

  const accounts = ACCOUNTS.map((a) => ({ id: a.id, name: a.name, cashBalance: round2(cash.get(a.id) ?? 0) }));

  const holdings: IHoldings[] = [];
  for (const [key, pos] of positions) {
    if (pos.qty <= 0) continue;
    const accountId = key.slice(0, key.indexOf('|'));
    const symbol = key.slice(key.indexOf('|') + 1);
    holdings.push({
      accountId,
      symbol,
      name: pos.name,
      qty: pos.qty,
      averagePrice: round2(pos.averagePrice),
      type: pos.assetType,
    });
  }

  return { accounts, holdings, transactions, alerts: ALERTS, snapshots: buildSnapshots() };
};
