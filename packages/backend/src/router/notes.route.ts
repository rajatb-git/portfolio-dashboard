import Router from '@koa/router';
import { NoteModel } from '../models/NoteModel';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

const noteModel = NoteModel();
noteModel.initialize();

const SYMBOL_RE = /^[A-Za-z0-9.\-^]{1,20}$/;

export const NotesRouter = () => {
  const router = new Router();

  router.get('/notes/:symbol', (ctx) => {
    try {
      const { symbol } = ctx.params;
      if (!symbol || !SYMBOL_RE.test(symbol)) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid symbol', 'Symbol must be 1-20 alphanumeric characters');
        return;
      }
      const note = noteModel.findById(symbol.toUpperCase());
      ctx.body = note ?? { symbol: symbol.toUpperCase(), body: '' };
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Get note "${ctx.params.symbol}"` });
      ctx.body = errorBody('Failed to get note', err.message);
      ctx.status = 400;
    }
  });

  router.post('/notes/:symbol', async (ctx) => {
    try {
      const { symbol } = ctx.params;
      if (!symbol || !SYMBOL_RE.test(symbol)) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid symbol', 'Symbol must be 1-20 alphanumeric characters');
        return;
      }
      const upper = symbol.toUpperCase();
      const body = String((ctx.request.body as any)?.body ?? '');

      // An empty note is a delete — don't leave blank records lying around.
      if (!body.trim()) {
        if (noteModel.findById(upper)) await noteModel.deleteById(upper);
        ctx.body = { symbol: upper, body: '' };
        ctx.status = 200;
        return;
      }

      const saved = await noteModel.insertOrUpdate({ symbol: upper, body }, upper);
      ctx.body = saved;
      ctx.status = 200;
    } catch (err: any) {
      logger.log({ level: 'error', message: err.message, label: `Save note "${ctx.params.symbol}"` });
      ctx.body = errorBody('Failed to save note', err.message);
      ctx.status = 400;
    }
  });

  return router;
};
