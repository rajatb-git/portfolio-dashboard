import fs from 'fs';
import Router from '@koa/router';
import path from 'path';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

const ALLOWED_LOG_FILES = ['combined', 'error'];

// winston appends, so the file is oldest-first. Present it newest-first for the
// viewer without rewriting the file (each entry is a single line).
const newestFirst = (contents: string): string =>
  contents.split('\n').filter((line) => line.length > 0).reverse().join('\n');

export const LogsRouter = () => {
  const router = new Router();

  router.get('/logs/:file', async (ctx) => {
    try {
      const file = ctx.params.file;
      if (!ALLOWED_LOG_FILES.includes(file)) {
        ctx.body = errorBody('Invalid log file', `Log file "${file}" is not allowed`);
        ctx.status = 400;
        return;
      }
      ctx.body = newestFirst(fs.readFileSync(path.resolve(`${file}.log`), 'utf8'));
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Get logs' });
      ctx.body = errorBody('Failed to read logs', err.message);
      ctx.status = 400;
    }
  });

  router.delete('/logs/:file', async (ctx) => {
    try {
      const file = ctx.params.file;
      if (!ALLOWED_LOG_FILES.includes(file)) {
        ctx.body = errorBody('Invalid log file', `Log file "${file}" is not allowed`);
        ctx.status = 400;
        return;
      }
      const logPath = path.resolve(`${file}.log`);
      fs.writeFileSync(logPath, '', 'utf8');
      ctx.body = fs.readFileSync(logPath, 'utf8');
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Delete logs' });
      ctx.body = errorBody('Failed to clear logs', err.message);
      ctx.status = 400;
    }
  });

  return router;
};
