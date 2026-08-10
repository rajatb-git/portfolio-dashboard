import * as fs from 'node:fs';
import * as path from 'node:path';

import { STORAGE_DIR } from './storage';

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
