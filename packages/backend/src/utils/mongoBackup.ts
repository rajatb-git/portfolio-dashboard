import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Archiver } from 'archiver';
import unzipper from 'unzipper';

import { createZipArchive } from './archive';
import { getMongoDb } from './mongoClient';

// Builds (but does not pipe or finalize) a zip archive of every collection in
// the given Mongo database, one storage/<collection>.json entry per
// collection, each containing { [id]: record } — the exact on-disk shape
// skewer-db used for its per-collection files, so exports/backups taken
// before and after this migration round-trip through the same zip format.
// Caller pipes the returned archive to its destination and calls
// .finalize() once ready.
export const buildDbArchive = async (dbName: string): Promise<{ archive: Archiver; collectionNames: string[] }> => {
  const db = await getMongoDb(dbName);
  const collections = await db.listCollections().toArray();
  const archive = createZipArchive();

  for (const { name } of collections) {
    const docs = await db.collection(name).find({}).toArray();
    const byId: Record<string, unknown> = {};
    for (const doc of docs as Array<Record<string, unknown>>) {
      const { _id, ...rest } = doc;
      byId[_id as string] = rest;
    }
    archive.append(JSON.stringify(byId), { name: `storage/${name}.json` });
  }

  return { archive, collectionNames: collections.map((c) => c.name) };
};

export type ParsedCollection = { collection: string; records: Array<Record<string, any>> };
export type RestoreResult = { collection: string; status: 'ok' | 'skipped' | 'error'; count?: number; error?: string };

const isCollectionDumpFile = (fileName: string): boolean =>
  fileName.endsWith('.json') && !fileName.endsWith('_index.json');

const collectionNameFromFile = (fileName: string): string => fileName.slice(0, -'.json'.length);

// Writes already-parsed collection dumps into Mongo.
// mode 'replace' always deletes-then-inserts — used for restoring a backup
// the user explicitly chose to restore, where overwriting whatever is
// currently there is exactly the point.
// mode 'migrate-if-empty' only writes collections that are currently empty in
// Mongo, skipping (not erroring) any that already have data — used for the
// one-time storage-dir migration, so it's safe to re-run without clobbering
// real usage that happened after the first run.
const writeCollectionsToMongo = async (
  dbName: string,
  parsed: Array<ParsedCollection>,
  mode: 'replace' | 'migrate-if-empty'
): Promise<RestoreResult[]> => {
  const db = await getMongoDb(dbName);
  const results: RestoreResult[] = [];
  for (const { collection, records } of parsed) {
    try {
      const coll = db.collection(collection);
      if (mode === 'migrate-if-empty') {
        const alreadyHasData = (await coll.countDocuments({}, { limit: 1 })) > 0;
        if (alreadyHasData) {
          results.push({ collection, status: 'skipped' });
          continue;
        }
      } else {
        await coll.deleteMany({});
      }
      if (records.length) {
        await coll.insertMany(
          records.map((record) => ({ _id: record.id, ...record })),
          { ordered: true }
        );
      }
      results.push({ collection, status: 'ok', count: records.length });
    } catch (err: any) {
      results.push({ collection, status: 'error', error: err.message });
    }
  }
  return results;
};

// Restores a zip produced by buildDbArchive (or a pre-migration skewer-db
// export, which used the identical shape) into the given Mongo database.
// Every entry is parsed and validated as JSON up front — nothing is written
// to Mongo unless the whole zip parses cleanly, so a corrupt upload fails
// clean instead of wiping data partway through. Each collection is then
// replaced (delete-all + insert), matching the destructive-replace semantics
// the old file-based import always had — this is a restore, not a merge.
// Records keep their original id/createdAt/updatedAt from the backup.
export const restoreDbArchive = async (dbName: string, zipBuffer: Buffer): Promise<RestoreResult[]> => {
  const directory = await unzipper.Open.buffer(zipBuffer);

  const parsed: Array<ParsedCollection> = [];
  for (const file of directory.files) {
    if (file.type === 'Directory') continue;

    let filePath = file.path;
    if (filePath.startsWith('storage/')) filePath = filePath.slice('storage/'.length);
    // Skip skewer-db's old per-collection index files (backward-compat with
    // pre-migration zips) and anything else that isn't a collection dump.
    if (!isCollectionDumpFile(filePath)) continue;

    const content = await file.buffer();
    const byId = JSON.parse(content.toString('utf-8'));
    parsed.push({ collection: collectionNameFromFile(filePath), records: Object.values(byId) });
  }

  return writeCollectionsToMongo(dbName, parsed, 'replace');
};

// Reads skewer-db's old per-collection JSON files directly off disk (the
// same STORAGE_DIR the pre-migration backend read/wrote), without needing
// the old build's HTTP server running at all — a fresh Mongo deploy sharing
// the same volume/directory as the old one can migrate straight from it.
export const parseStorageDir = (storageDir: string): Array<ParsedCollection> => {
  if (!fs.existsSync(storageDir)) return [];

  const parsed: Array<ParsedCollection> = [];
  for (const fileName of fs.readdirSync(storageDir)) {
    if (!isCollectionDumpFile(fileName)) continue;
    const raw = fs.readFileSync(path.join(storageDir, fileName), 'utf-8');
    const byId = JSON.parse(raw);
    parsed.push({ collection: collectionNameFromFile(fileName), records: Object.values(byId) });
  }
  return parsed;
};

// One-time migration of a skewer-db storage directory into Mongo. Safe to
// re-run: by default it only populates collections that are still empty in
// Mongo (so running it again after the app has real Mongo-native data does
// nothing) — pass force=true to make it a destructive replace instead, the
// same semantics restoreDbArchive uses for restoring a chosen backup.
export const migrateStorageDirToMongo = async (
  dbName: string,
  storageDir: string,
  force = false
): Promise<RestoreResult[]> => {
  const parsed = parseStorageDir(storageDir);
  return writeCollectionsToMongo(dbName, parsed, force ? 'replace' : 'migrate-if-empty');
};
