import Router from '@koa/router';
import { DocumentImportController, ImportTarget } from '../controller/DocumentImportController';
import { errorBody } from '../utils/error';
import { logger } from '../utils/winston';

const VALID_TARGETS: ImportTarget[] = ['transactions', 'holdings'];
const MAX_TEXT_LENGTH = 200_000;

export const AiImportRouter = () => {
  const router = new Router();
  const controller = new DocumentImportController();

  // Parse a brokerage document into transaction/holding rows via local AI only.
  router.post('/ai-import/parse', async (ctx) => {
    try {
      const body = (ctx.request.body || {}) as { target?: string; text?: string };
      const target = String(body.target ?? '') as ImportTarget;

      if (!VALID_TARGETS.includes(target)) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid target', `target must be one of: ${VALID_TARGETS.join(', ')}`);
        return;
      }

      const text = String(body.text ?? '').trim();
      if (!text) {
        ctx.status = 400;
        ctx.body = errorBody('Invalid document', 'Document text is required');
        return;
      }
      if (text.length > MAX_TEXT_LENGTH) {
        ctx.status = 400;
        ctx.body = errorBody('Document too large', `Document text exceeds ${MAX_TEXT_LENGTH} characters`);
        return;
      }

      ctx.body = await controller.parse(target, text);
      ctx.status = 200;
    } catch (error: any) {
      logger.log({ level: 'error', message: error.message, label: 'AI document import' });
      ctx.status = 400;
      ctx.body = errorBody('Failed to parse document', error.message);
    }
  });

  return router;
};
