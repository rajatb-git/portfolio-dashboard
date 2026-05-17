import * as fs from 'fs';
import * as path from 'path';

import { STORAGE_DIR } from './storage';

const findValidJsonEnd = (s: string): number => {
  let depth = 0;
  let inString = false;
  let escape = false;
  let started = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\') {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === '{' || c === '[') {
      depth++;
      started = true;
    } else if (c === '}' || c === ']') {
      depth--;
      if (started && depth === 0) return i + 1;
    }
  }
  return -1;
};

const repairFile = (filePath: string): void => {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return;
  }
  if (!raw.trim()) return;

  try {
    JSON.parse(raw);
    return;
  } catch {
    // fall through to repair
  }

  const validEnd = findValidJsonEnd(raw);
  let repaired: string | null = null;
  if (validEnd > 0) {
    const candidate = raw.slice(0, validEnd);
    try {
      JSON.parse(candidate);
      repaired = candidate;
    } catch {
      repaired = null;
    }
  }

  const backup = `${filePath}.corrupt-${Date.now()}.bak`;
  try {
    fs.writeFileSync(backup, raw);
  } catch {
    // backup is best-effort
  }

  if (repaired !== null) {
    fs.writeFileSync(filePath, repaired);
    const trimmed = raw.length - repaired.length;
    console.warn(
      `[storage-repair] Repaired ${path.basename(filePath)} — trimmed ${trimmed} trailing byte(s). Backup at ${path.basename(backup)}`
    );
  } else {
    fs.writeFileSync(filePath, '{}');
    console.error(
      `[storage-repair] Could not recover ${path.basename(filePath)} — reset to {}. Backup at ${path.basename(backup)}`
    );
  }
};

export const repairStorage = (): void => {
  if (!fs.existsSync(STORAGE_DIR)) return;
  for (const file of fs.readdirSync(STORAGE_DIR)) {
    if (!file.endsWith('.json')) continue;
    repairFile(path.join(STORAGE_DIR, file));
  }
};

// skewer-db writes JSON files via fs.writeFile, which is not atomic — a crash
// or overlapping write can leave a partially-written file (the root cause of
// the trailing-garbage corruption this module repairs). Patch its FileStorage
// to write via tempfile + rename, which is atomic on the same filesystem.
const patchAtomicWrites = (): void => {
  try {
    const { FileStorage } = require('skewer-db/dist/Storage');
    FileStorage.write = async (filePath: string, data: string): Promise<void> => {
      const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
      await fs.promises.writeFile(tmp, data);
      await fs.promises.rename(tmp, filePath);
    };
  } catch (err) {
    console.warn('[storage-repair] Could not patch atomic writes:', err);
  }
};

repairStorage();
patchAtomicWrites();
