import KoaRouter from 'koa-router';

import { getAiConfig, saveAiConfig, maskAiConfig, IAiConfig } from '../models/AiConfigModel';
import { errorBody } from '../utils/error';

export const SettingsRouter = () => {
  const router = new KoaRouter();

  router.get('/settings/ai-config', async (ctx) => {
    try {
      const config = await getAiConfig();
      ctx.body = maskAiConfig(config);
      ctx.status = 200;
    } catch (error) {
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
        claudeApiKey: body.claudeApiKey !== undefined && !body.claudeApiKey.startsWith('••') ? body.claudeApiKey : current.claudeApiKey,
        claudeModel: body.claudeModel || current.claudeModel,
        geminiApiKey: body.geminiApiKey !== undefined && !body.geminiApiKey.startsWith('••') ? body.geminiApiKey : current.geminiApiKey,
        geminiModel: body.geminiModel || current.geminiModel,
        ollamaHost: body.ollamaHost || current.ollamaHost,
        ollamaModel: body.ollamaModel || current.ollamaModel,
      };

      await saveAiConfig(updated);
      ctx.body = maskAiConfig(updated);
      ctx.status = 200;
    } catch (error) {
      ctx.status = 500;
      ctx.body = errorBody('Failed to save AI config', error.message);
    }
  });

  return router;
};
