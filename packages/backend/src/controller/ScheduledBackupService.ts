import fs from 'node:fs';
import path from 'node:path';
import moment from 'moment';
import type { IScheduledBackupConfig } from '../models/ScheduledBackupConfigModel';
import { createZipArchive } from '../utils/archive';
import { PersistentInterval } from '../utils/PersistentInterval';
import { BACKUPS_DIR, STORAGE_DIR } from '../utils/storage';
import { logger } from '../utils/winston';

const LABEL = 'ScheduledBackupService';
const FILE_PREFIX = 'portfolio-backup-';

export type BackupFile = { file: string; size: number; createdAt: string };

class ScheduledBackupService {
  private readonly scheduler = new PersistentInterval('scheduled_backup');
  private config: IScheduledBackupConfig = { enabled: false, intervalHours: 24, retentionCount: 7 };
  private running = false;

  listBackups(): BackupFile[] {
    if (!fs.existsSync(BACKUPS_DIR)) return [];
    return fs
      .readdirSync(BACKUPS_DIR)
      .filter((f) => f.startsWith(FILE_PREFIX) && f.endsWith('.zip'))
      .map((file) => {
        const stat = fs.statSync(path.join(BACKUPS_DIR, file));
        return { file, size: stat.size, createdAt: stat.mtime.toISOString() };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private pruneOldBackups(retentionCount: number): void {
    const backups = this.listBackups();
    for (const stale of backups.slice(retentionCount)) {
      try {
        fs.rmSync(path.join(BACKUPS_DIR, stale.file), { force: true });
      } catch (err: any) {
        logger.log({ level: 'error', label: LABEL, message: `Failed to prune ${stale.file}: ${err.message}` });
      }
    }
  }

  async runBackup(): Promise<BackupFile> {
    // Guard against overlapping runs if a backup outlasts the interval.
    if (this.running) throw new Error('A backup is already in progress');
    this.running = true;
    try {
      if (!fs.existsSync(STORAGE_DIR)) throw new Error('Storage directory does not exist yet');
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });

      const stamp = moment().format('YYYY-MM-DDTHH-mm-ss');
      const file = `${FILE_PREFIX}${stamp}.zip`;
      const dest = path.join(BACKUPS_DIR, file);

      try {
        await new Promise<void>((resolve, reject) => {
          const output = fs.createWriteStream(dest);
          const archive = createZipArchive();
          output.on('close', () => resolve());
          output.on('error', reject);
          archive.on('error', reject);
          archive.pipe(output);
          archive.directory(STORAGE_DIR, 'storage');
          archive.finalize();
        });
      } catch (err) {
        // Don't leave a truncated/empty zip masquerading as a valid backup.
        fs.rmSync(dest, { force: true });
        throw err;
      }

      const size = fs.statSync(dest).size;
      this.pruneOldBackups(this.config.retentionCount);
      logger.log({ level: 'info', label: LABEL, message: `Backup created: ${file} (${size} bytes)` });
      return { file, size, createdAt: new Date().toISOString() };
    } finally {
      this.running = false;
    }
  }

  start(config: IScheduledBackupConfig): void {
    this.stop();
    this.config = config;
    if (!config.enabled) {
      logger.log({ level: 'info', label: LABEL, message: 'Disabled' });
      return;
    }

    const intervalMs = Math.max(1, config.intervalHours) * 60 * 60 * 1000;
    void this.scheduler.start(intervalMs, () =>
      this.runBackup().catch((err: any) => {
        logger.log({ level: 'error', label: LABEL, message: err.message });
      })
    );
    logger.log({ level: 'info', label: LABEL, message: `Started — interval: ${config.intervalHours}h` });
  }

  stop(): void {
    this.scheduler.stop();
    logger.log({ level: 'info', label: LABEL, message: 'Stopped' });
  }

  reconfigure(config: IScheduledBackupConfig): void {
    this.start(config);
  }
}

export const scheduledBackupService = new ScheduledBackupService();
