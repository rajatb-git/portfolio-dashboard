import * as dotenv from 'dotenv';

dotenv.config();

import { migrateStorageDirToMongo } from '../utils/mongoBackup';
import { closeMongoClient, DEFAULT_MONGO_DB_NAME } from '../utils/mongoClient';
import { STORAGE_DIR } from '../utils/storage';

// One-time CLI migration of skewer-db's old storage/*.json files into
// MongoDB, run directly against STORAGE_DIR — no dependency on the old
// (pre-migration) build's HTTP server being up. On a docker-compose upgrade
// that keeps the same backend-storage volume, the old files are already
// sitting at this same path, so this can just be run once after MONGO_URI is
// configured. Safe to re-run by default: only empty Mongo collections are
// populated. Pass --force to overwrite collections that already have data.
const force = process.argv.includes('--force');

async function main(): Promise<void> {
  console.log(
    `Migrating ${STORAGE_DIR} into MongoDB database "${DEFAULT_MONGO_DB_NAME}"${force ? ' (--force: overwriting existing data)' : ''}...\n`
  );

  const results = await migrateStorageDirToMongo(DEFAULT_MONGO_DB_NAME, STORAGE_DIR, force);

  if (results.length === 0) {
    console.log(`No collection files found in ${STORAGE_DIR} — nothing to migrate.`);
    return;
  }

  for (const result of results) {
    if (result.status === 'ok') {
      console.log(`  ok      ${result.collection} (${result.count} record${result.count === 1 ? '' : 's'})`);
    } else if (result.status === 'skipped') {
      console.log(`  skipped ${result.collection} — already has data in Mongo (use --force to overwrite)`);
    } else {
      console.error(`  FAILED  ${result.collection}: ${result.error}`);
    }
  }

  const failed = results.filter((result) => result.status === 'error');
  if (failed.length > 0) {
    console.error(`\n${failed.length} collection(s) failed to migrate.`);
    process.exitCode = 1;
  } else {
    console.log('\nDone.');
  }
}

main()
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => closeMongoClient());
