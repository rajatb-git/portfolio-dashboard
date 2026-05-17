import * as fs from 'node:fs';
import * as path from 'node:path';

export const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(process.cwd(), 'storage');

export const ensureStorageCwd = (): void => {
  const parent = path.dirname(STORAGE_DIR);
  const basename = path.basename(STORAGE_DIR);

  if (basename !== 'storage') {
    throw new Error(`STORAGE_DIR must end in 'storage' (got ${STORAGE_DIR})`);
  }

  fs.mkdirSync(STORAGE_DIR, { recursive: true });

  if (process.cwd() !== parent) {
    process.chdir(parent);
  }
};
