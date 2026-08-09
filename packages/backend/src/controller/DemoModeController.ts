import { buildMockDataset } from '../mockData/mockDataset';
import { AccountModel } from '../models/AccountModel';
import { AlertModel } from '../models/AlertModel';
import { HoldingsModel } from '../models/HoldingsModel';
import { PortfolioSnapshotDBModel } from '../models/PortfolioSnapshotModel';
import { TransactionModel } from '../models/TransactionModel';
import { isDemoMode, setDemoMode } from '../utils/demoMode';

export type DemoModeStatus = { enabled: boolean };

// Callers must already be in demo mode (setDemoMode(true) happened first) so
// these resolve to the mock-mode instances via storageModelFactory — the
// real database is never reachable from this module.
const seedMockData = async (): Promise<void> => {
  const dataset = buildMockDataset();

  const accounts = await AccountModel().initialize();
  const holdings = await HoldingsModel().initialize();
  const transactions = await TransactionModel().initialize();
  const alerts = await AlertModel().initialize();
  const snapshots = await PortfolioSnapshotDBModel().initialize();

  for (const account of dataset.accounts) {
    await accounts.insertOne({ name: account.name, cashBalance: account.cashBalance }, account.id);
  }
  if (dataset.holdings.length) await holdings.insertMany(dataset.holdings);
  if (dataset.transactions.length) await transactions.insertMany(dataset.transactions);
  if (dataset.alerts.length) await alerts.insertMany(dataset.alerts);
  if (dataset.snapshots.length) await snapshots.insertMany(dataset.snapshots);
};

export const getDemoModeStatus = (): DemoModeStatus => ({ enabled: isDemoMode() });

export const enableDemoMode = async (): Promise<DemoModeStatus> => {
  setDemoMode(true);

  const accounts = await AccountModel().initialize();
  if (accounts.countAll() === 0) {
    await seedMockData();
  }

  return { enabled: true };
};

export const disableDemoMode = (): DemoModeStatus => {
  setDemoMode(false);
  return { enabled: false };
};

export const resetDemoData = async (): Promise<DemoModeStatus> => {
  if (!isDemoMode()) {
    throw new Error('Enable demo mode before resetting its data');
  }

  const accounts = await AccountModel().initialize();
  const holdings = await HoldingsModel().initialize();
  const transactions = await TransactionModel().initialize();
  const alerts = await AlertModel().initialize();
  const snapshots = await PortfolioSnapshotDBModel().initialize();

  await accounts.deleteAll();
  await holdings.deleteAll();
  await transactions.deleteAll();
  await alerts.deleteAll();
  await snapshots.deleteAll();

  await seedMockData();

  return { enabled: true };
};
