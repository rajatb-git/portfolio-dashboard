import * as fs from 'node:fs';
import * as path from 'node:path';

import { STORAGE_DIR } from './storage';

// Sibling to `storage/`, not inside it — mirrors BACKUPS_DIR so the mock
// database is never swept up by the real export/import zip flow.
export const MOCK_STORAGE_DIR = path.resolve(STORAGE_DIR, '..', 'storage-mock');

const FLAG_FILE = path.resolve(STORAGE_DIR, '..', 'demo-mode.json');

const readFlag = (): boolean => {
  try {
    return JSON.parse(fs.readFileSync(FLAG_FILE, 'utf-8')).enabled === true;
  } catch {
    return false;
  }
};

// In-memory so every model getter can check it synchronously; persisted to
// disk so the flag survives a backend restart mid-demo.
let enabled = readFlag();

export const isDemoMode = (): boolean => enabled;

export const setDemoMode = (value: boolean): void => {
  enabled = value;
  fs.mkdirSync(path.dirname(FLAG_FILE), { recursive: true });
  fs.writeFileSync(FLAG_FILE, JSON.stringify({ enabled }));
};
