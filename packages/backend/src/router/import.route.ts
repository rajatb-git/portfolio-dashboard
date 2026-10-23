import Router from '@koa/router';
import { commitImport, type ImportRequest, listImportRuns, previewImport } from '../controller/ImportController';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

export const ImportRouter = () => {
  const router = new Router();

  // Dry run: how every row would be read and what the account would look like.
  router.post('/import/preview', async (ctx) => {
    try {
      ctx.body = await previewImport(ctx.request.body as ImportRequest);
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Import preview' });
      ctx.body = errorBody('Could not read the import', err.message);
      ctx.status = 400;
    }
  });

  router.post('/import/commit', async (ctx) => {
    try {
      ctx.body = await commitImport(ctx.request.body as ImportRequest);
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Import commit' });
      ctx.body = errorBody('Import failed', err.message);
      ctx.status = 400;
    }
  });

  router.get('/import/runs', async (ctx) => {
    try {
      ctx.body = await listImportRuns();
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: 'Import runs' });
      ctx.body = errorBody('Failed to load past imports', err.message);
      ctx.status = 500;
    }
  });

  return router;
};
