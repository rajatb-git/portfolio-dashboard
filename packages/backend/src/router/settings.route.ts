import fs from 'node:fs';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import archiver from 'archiver';
import Router from '@koa/router';
import unzipper from 'unzipper';

import { getAiConfig, IAiConfig, maskAiConfig, saveAiConfig } from '../models/AiConfigModel';
import { getAlertMonitorConfig, IAlertMonitorConfig, saveAlertMonitorConfig } from '../models/AlertMonitorConfigModel';
import { getLockStatus, setLockConfig } from '../models/LockConfigModel';
import {
  getNotificationConfig,
  INotificationConfig,
  isMaskedPassword,
  maskNotificationConfig,
  saveNotificationConfig,
} from '../models/NotificationConfigModel';
import { getValueCalcConfig, IValueCalcConfig, saveValueCalcConfig } from '../models/ValueCalcConfigModel';
import { alertMonitorService } from '../controller/AlertMonitorService';
import { configureFromSaved, sendTestNotification } from '../controller/NotificationDispatcher';
import { portfolioValueCalcService } from '../controller/PortfolioValueCalcService';
import { errorBody } from '../utils/error';
import { STORAGE_DIR } from '../utils/storage';
import { logger } from '../utils/winston';

export const SettingsRouter = () => {
  const router = new Router();

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

  router.get('/settings/lock', async (ctx) => {
    try {
      const status = await getLockStatus();
      ctx.body = status;
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'lock status' });
      ctx.status = 500;
      ctx.body = errorBody('Failed to get lock status', error.message);
    }
  });

  router.post('/settings/lock', async (ctx) => {
    try {
      const body = (ctx.request.body || {}) as {
        enabled?: boolean;
        code?: string;
        currentCode?: string;
        idleTimeoutMinutes?: number;
      };

      if (typeof body.enabled !== 'boolean') {
        ctx.status = 400;
        ctx.body = errorBody('Invalid request', '"enabled" boolean is required');
        return;
      }

      const current = await getLockStatus();

      if (current.enabled && !body.currentCode) {
        ctx.status = 400;
        ctx.body = errorBody('Wrong code', 'Current code is required');
        return;
      }

      if (body.enabled && !current.enabled && !body.code) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid code', 'A new code is required to enable the lock');
        return;
      }

      if (body.enabled && current.enabled && body.code && !body.currentCode) {
        ctx.status = 400;
        ctx.body = errorBody('Wrong code', 'Current code is required to change the code');
        return;
      }

      if (body.code !== undefined && !/^\d{6}$/.test(body.code)) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid code', 'Code must be 6 digits');
        return;
      }

      try {
        const next = await setLockConfig({
          enabled: body.enabled,
          code: body.code,
          currentCode: body.currentCode,
          idleTimeoutMinutes: body.idleTimeoutMinutes,
        });
        ctx.body = next;
        ctx.status = 200;
      } catch (inner: any) {
        ctx.status = 400;
        ctx.body = errorBody(inner.name || 'Invalid request', inner.message || 'Failed to update lock');
      }
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'lock save' });
      ctx.status = 500;
      ctx.body = errorBody('Failed to save lock settings', error.message);
    }
  });

  router.get('/settings/value-calc', async (ctx) => {
    try {
      const config = await getValueCalcConfig();
      ctx.body = config;
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'value-calc config get' });
      ctx.status = 500;
      ctx.body = errorBody('Failed to get value calc config', error.message);
    }
  });

  router.post('/settings/value-calc', async (ctx) => {
    try {
      const body = ctx.request.body as Partial<IValueCalcConfig>;

      if (typeof body.enabled !== 'boolean') {
        ctx.status = 400;
        ctx.body = errorBody('Invalid request', '"enabled" boolean is required');
        return;
      }

      const intervalMinutes = typeof body.intervalMinutes === 'number' ? body.intervalMinutes : 15;
      const VALID_INTERVALS = [5, 10, 15, 30, 60];
      if (!VALID_INTERVALS.includes(intervalMinutes)) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid interval', `intervalMinutes must be one of: ${VALID_INTERVALS.join(', ')}`);
        return;
      }

      const config: IValueCalcConfig = { enabled: body.enabled, intervalMinutes };
      await saveValueCalcConfig(config);
      portfolioValueCalcService.reconfigure(config);

      ctx.body = config;
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'value-calc config save' });
      ctx.status = 500;
      ctx.body = errorBody('Failed to save value calc config', error.message);
    }
  });

  router.get('/settings/alerts-monitor', async (ctx) => {
    try {
      ctx.body = await getAlertMonitorConfig();
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'alerts-monitor config get' });
      ctx.status = 500;
      ctx.body = errorBody('Failed to get alert monitor config', error.message);
    }
  });

  router.post('/settings/alerts-monitor', async (ctx) => {
    try {
      const body = ctx.request.body as Partial<IAlertMonitorConfig>;

      if (typeof body.enabled !== 'boolean') {
        ctx.status = 400;
        ctx.body = errorBody('Invalid request', '"enabled" boolean is required');
        return;
      }

      const intervalMinutes = typeof body.intervalMinutes === 'number' ? body.intervalMinutes : 5;
      const VALID_INTERVALS = [1, 5, 10, 15, 30, 60];
      if (!VALID_INTERVALS.includes(intervalMinutes)) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid interval', `intervalMinutes must be one of: ${VALID_INTERVALS.join(', ')}`);
        return;
      }

      const config: IAlertMonitorConfig = { enabled: body.enabled, intervalMinutes };
      await saveAlertMonitorConfig(config);
      alertMonitorService.reconfigure(config);

      ctx.body = config;
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'alerts-monitor config save' });
      ctx.status = 500;
      ctx.body = errorBody('Failed to save alert monitor config', error.message);
    }
  });

  router.get('/settings/notifications', async (ctx) => {
    try {
      ctx.body = maskNotificationConfig(await getNotificationConfig());
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'notifications config get' });
      ctx.status = 500;
      ctx.body = errorBody('Failed to get notification config', error.message);
    }
  });

  router.post('/settings/notifications', async (ctx) => {
    try {
      const body = ctx.request.body as Partial<INotificationConfig>;
      const mqtt = body?.mqtt;
      if (!mqtt || typeof mqtt.enabled !== 'boolean') {
        ctx.status = 400;
        ctx.body = errorBody('Invalid request', 'mqtt config with "enabled" boolean is required');
        return;
      }
      if (mqtt.enabled && !String(mqtt.url ?? '').trim()) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid request', 'Broker URL is required when MQTT is enabled');
        return;
      }

      // Keep the stored password when the client sends back the masked value.
      const current = await getNotificationConfig();
      const password =
        typeof mqtt.password === 'string' && !isMaskedPassword(mqtt.password) ? mqtt.password : current.mqtt.password;

      const saved = await saveNotificationConfig({ mqtt: { ...mqtt, password } as INotificationConfig['mqtt'] });
      await configureFromSaved();

      ctx.body = maskNotificationConfig(saved);
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'notifications config save' });
      ctx.status = 500;
      ctx.body = errorBody('Failed to save notification config', error.message);
    }
  });

  router.post('/settings/notifications/test', async (ctx) => {
    try {
      ctx.body = await sendTestNotification();
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'notifications test' });
      ctx.status = 500;
      ctx.body = errorBody('Failed to send test notification', error.message);
    }
  });

  return router;
};
