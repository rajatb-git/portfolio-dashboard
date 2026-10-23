import { ISkewerModel, SchemaType } from '../utils/mongoModel';
import { createStorageModel } from '../utils/storageModelFactory';

// One committed import. The list is shown on the Import page, and the
// performance history skips the day of each one: an import changes the
// portfolio's value without any trade the returns could net out.
export interface IImportRun {
  accountId: string;
  kind: 'positions' | 'history';
  mode: 'add' | 'replace';
  historyMode?: 'build' | 'record';
  fileName?: string;
  positions: number;
  lots: number;
  transactions: number;
  skipped: number;
  cashChange: number;
}

export const ImportRunSchema: SchemaType = {
  accountId: { type: String, required: true },
  kind: { type: String, enum: ['positions', 'history'], required: true },
  mode: { type: String, enum: ['add', 'replace'], required: true },
  historyMode: { type: String, enum: ['build', 'record'], required: false },
  fileName: { type: String, required: false },
  positions: { type: Number, required: true },
  lots: { type: Number, required: true },
  transactions: { type: Number, required: true },
  skipped: { type: Number, required: true },
  cashChange: { type: Number, required: true },
};

export interface IImportRunModel extends IImportRun, ISkewerModel {}

export const ImportRunDBModel = createStorageModel<IImportRunModel>('import_runs', ImportRunSchema);
