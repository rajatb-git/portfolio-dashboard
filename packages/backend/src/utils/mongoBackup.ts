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

export type RestoreResult = { collection: string; status: 'ok' | 'error'; count?: number; error?: string };

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

  const parsed: Array<{ collection: string; records: Array<Record<string, any>> }> = [];
  for (const file of directory.files) {
    if (file.type === 'Directory') continue;

    let filePath = file.path;
    if (filePath.startsWith('storage/')) filePath = filePath.slice('storage/'.length);
    // Skip skewer-db's old per-collection index files (backward-compat with
    // pre-migration zips) and anything else that isn't a collection dump.
    if (!filePath.endsWith('.json') || filePath.endsWith('_index.json')) continue;

    const collection = filePath.slice(0, -'.json'.length);
    const content = await file.buffer();
    const byId = JSON.parse(content.toString('utf-8'));
    parsed.push({ collection, records: Object.values(byId) });
  }

  const db = await getMongoDb(dbName);
  const results: RestoreResult[] = [];
  for (const { collection, records } of parsed) {
    try {
      const coll = db.collection(collection);
      await coll.deleteMany({});
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
