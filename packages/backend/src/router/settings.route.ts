import fs from 'node:fs';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import archiver from 'archiver';
import KoaRouter from 'koa-router';
import unzipper from 'unzipper';

import { getAiConfig, IAiConfig, maskAiConfig, saveAiConfig } from '../models/AiConfigModel';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

const STORAGE_DIR = path.resolve(process.cwd(), 'storage');

export const SettingsRouter = () => {
  const router = new KoaRouter();

  router.get('/settings/db/export', async (ctx) => {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        ctx.status = 404;
        ctx.body = errorBody('No data to export', 'Storage directory does not exist yet');
        return;
      }

      const archive = archiver('zip', { zlib: { level: 9 } });
      const passthrough = new PassThrough();
      archive.pipe(passthrough);

      archive.directory(STORAGE_DIR, 'storage');
      archive.finalize();

      const datestamp = new Date().toISOString().slice(0, 10);
      ctx.set('Content-Disposition', `attachment; filename="portfolio-backup-${datestamp}.zip"`);
      ctx.set('Content-Type', 'application/zip');
      ctx.body = passthrough;
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'DB export' });
      ctx.status = 500;
      ctx.body = errorBody('Failed to export database', error.message);
    }
  });

  router.post('/settings/db/import', async (ctx) => {
    try {
      const rawBody = ctx.request.body;

      let zipBuffer: Buffer;
      if (Buffer.isBuffer(rawBody)) {
        zipBuffer = rawBody;
      } else {
        ctx.status = 400;
        ctx.body = errorBody('Invalid request', 'Expected a zip file upload');
        return;
      }

      // Clear existing storage
      if (fs.existsSync(STORAGE_DIR)) {
        fs.rmSync(STORAGE_DIR, { recursive: true, force: true });
      }
      fs.mkdirSync(STORAGE_DIR, { recursive: true });

      // Extract zip
      const directory = await unzipper.Open.buffer(zipBuffer);
      for (const file of directory.files) {
        if (file.type === 'Directory') continue;

        // Files in the zip are under "storage/" prefix
        let filePath = file.path;
        if (filePath.startsWith('storage/')) {
          filePath = filePath.slice('storage/'.length);
        }

        const destPath = path.join(STORAGE_DIR, filePath);
        const destDir = path.dirname(destPath);

        if (!destPath.startsWith(STORAGE_DIR)) continue;

        fs.mkdirSync(destDir, { recursive: true });
        const content = await file.buffer();
        fs.writeFileSync(destPath, content);
      }

      ctx.body = { message: 'Import completed. Restart the backend for changes to take effect.' };
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'DB import' });
      ctx.status = 500;
      ctx.body = errorBody('Failed to import database', error.message);
    }
  });

  router.get('/settings/ai-config', async (ctx) => {
    try {
      const config = await getAiConfig();
      ctx.body = maskAiConfig(config);
      ctx.status = 200;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to get AI config', error.message);
    }
  });

  router.post('/settings/ai-config', async (ctx) => {
    try {
      const body = ctx.request.body as Partial<IAiConfig>;
      const current = await getAiConfig();

      const updated: IAiConfig = {
        enabled: body.enabled ?? current.enabled,
        provider: body.provider ?? current.provider,
        claudeApiKey:
          body.claudeApiKey !== undefined && !body.claudeApiKey.startsWith('••')
            ? body.claudeApiKey
            : current.claudeApiKey,
        claudeModel: body.claudeModel || current.claudeModel,
        geminiApiKey:
          body.geminiApiKey !== undefined && !body.geminiApiKey.startsWith('••')
            ? body.geminiApiKey
            : current.geminiApiKey,
        geminiModel: body.geminiModel || current.geminiModel,
        ollamaHost: body.ollamaHost || current.ollamaHost,
        ollamaModel: body.ollamaModel || current.ollamaModel,
      };

      await saveAiConfig(updated);
      ctx.body = maskAiConfig(updated);
      ctx.status = 200;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to save AI config', error.message);
    }
  });

  return router;
};
