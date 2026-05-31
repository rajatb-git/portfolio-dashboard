import Router from '@koa/router';

export const HealthRouter = () => {
  const router = new Router();

  router.get('/health', (ctx) => {
    ctx.body = "i'm here";
    ctx.status = 200;
  });

  return router;
};
