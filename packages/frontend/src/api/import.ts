import { DB_HOST } from '@/config';
import { catchCustomError } from './apiUtil';
import axios from './axios';

export type ImportKind = 'positions' | 'history';
export type DateOrder = 'MDY' | 'DMY' | 'YMD';

// One row in the import engine's own shape; values stay as the file had them.
export type RawImportRow = {
  symbol?: string;
  name?: string;
  qty?: string | number;
  price?: string | number;
  costBasis?: string | number;
  amount?: string | number;
  date?: string;
  action?: string;
  assetType?: string;
};

export type ImportOptions = {
  mode: 'add' | 'replace';
  historyMode: 'build' | 'record';
  applyCash: boolean;
  dateOrder: DateOrder;
  defaultAssetType: 'stock' | 'crypto';
};

export type ImportRequest = {
  accountId: string;
  kind: ImportKind;
  rows: RawImportRow[];
  options: ImportOptions;
  excluded?: number[];
  fileName?: string;
};

export type RowStatus = 'ok' | 'warning' | 'error' | 'skipped' | 'duplicate' | 'excluded';

export type PlannedRow = {
  index: number;
  status: RowStatus;
  messages: string[];
  symbol?: string;
  action?: string;
  qty?: number;
  price?: number;
  date?: string;
  type?: 'stock' | 'crypto' | 'cash';
};

export type PlannedPosition = {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto';
  qty: number;
  averagePrice: number;
  lots: number;
  estimatedLots: number;
  change: 'new' | 'updated' | 'removed' | 'closed';
};

export type ImportPlan = {
  kind: ImportKind;
  options: ImportOptions;
  account: { id: string; name: string; positions: number; transactions: number; cashBalance: number };
  rows: PlannedRow[];
  positions: PlannedPosition[];
  summary: {
    rows: number;
    imported: number;
    warnings: number;
    errors: number;
    skipped: number;
    duplicates: number;
    excluded: number;
    positions: number;
    lots: number;
    estimatedLots: number;
    transactions: number;
    realizedGain: number;
    removedPositions: number;
    removedTransactions: number;
    cashBefore: number;
    cashAfter: number;
  };
  canCommit: boolean;
};

export type ImportRun = {
  id: string;
  accountId: string;
  kind: ImportKind;
  mode: 'add' | 'replace';
  historyMode?: 'build' | 'record';
  fileName?: string;
  positions: number;
  lots: number;
  transactions: number;
  skipped: number;
  cashChange: number;
  createdAt: string;
};

export type DocumentParseResult = {
  rows: RawImportRow[];
  skipped: string[];
  provider: string;
  model: string;
  chunks: number;
};

export default class ImportAPI {
  preview = async (request: ImportRequest): Promise<ImportPlan> =>
    axios
      .post(DB_HOST + '/import/preview', request)
      .then((response) => response.data)
      .catch(catchCustomError);

  commit = async (request: ImportRequest): Promise<ImportPlan> =>
    axios
      .post(DB_HOST + '/import/commit', request)
      .then((response) => response.data)
      .catch(catchCustomError);

  getRuns = async (): Promise<ImportRun[]> =>
    axios
      .get(DB_HOST + '/import/runs')
      .then((response) => response.data)
      .catch(catchCustomError);

  // Reads a document with the local AI (Ollama only — enforced server-side).
  parseDocument = async (kind: ImportKind, text: string): Promise<DocumentParseResult> =>
    axios
      .post(DB_HOST + '/ai-import/parse', { target: kind === 'positions' ? 'holdings' : 'transactions', text })
      .then((response) => response.data)
      .catch(catchCustomError);
}
