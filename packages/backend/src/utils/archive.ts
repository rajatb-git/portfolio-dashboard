import type { Archiver } from 'archiver';

// archiver@8 is ESM-only and replaced its old callable default export with
// per-format classes (ZipArchive, …). @types/archiver@7 still describes the
// legacy `archiver('zip')` form, which throws at runtime, so build the class
// through require and re-assert the typed shape instead.
export function createZipArchive(): Archiver {
  const { ZipArchive } = require('archiver') as { ZipArchive: new (options?: unknown) => Archiver };
  return new ZipArchive({ zlib: { level: 9 } });
}
