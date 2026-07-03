import fs from 'node:fs';
import path from 'node:path';
import moment from 'moment';
import type { IScheduledBackupConfig } from '../models/ScheduledBackupConfigModel';
import { createZipArchive } from '../utils/archive';
import { BACKUPS_DIR, STORAGE_DIR } from '../utils/storage';
import { logger } from '../utils/winston';

const LABEL = 'ScheduledBackupService';
const FILE_PREFIX = 'portfolio-backup-';

export type BackupFile = { file: string; size: number; createdAt: string };

class ScheduledBackupService {
  private timer: NodeJS.Timeout | null = null;
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

  private newestBackupAgeMs(): number {
    const newest = this.listBackups()[0];
    if (!newest) return Number.POSITIVE_INFINITY;
    return Date.now() - new Date(newest.createdAt).getTime();
  }

  start(config: IScheduledBackupConfig): void {
    this.stop();
    this.config = config;
    if (!config.enabled) {
      logger.log({ level: 'info', label: LABEL, message: 'Disabled' });
      return;
    }

    const intervalMs = Math.max(1, config.intervalHours) * 60 * 60 * 1000;
    this.timer = setInterval(() => {
      this.runBackup().catch((err: any) => {
        logger.log({ level: 'error', label: LABEL, message: err.message });
      });
    }, intervalMs);
    logger.log({ level: 'info', label: LABEL, message: `Started — interval: ${config.intervalHours}h` });

    // Catch up on boot if the most recent backup is already overdue, but skip
    // when a fresh backup exists so a server restart doesn't spam the folder.
    if (this.newestBackupAgeMs() >= intervalMs) {
      this.runBackup().catch((err: any) => {
        logger.log({ level: 'error', label: LABEL, message: err.message });
      });
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.log({ level: 'info', label: LABEL, message: 'Stopped' });
    }
  }

  reconfigure(config: IScheduledBackupConfig): void {
    this.start(config);
  }
}

export const scheduledBackupService = new ScheduledBackupService();
