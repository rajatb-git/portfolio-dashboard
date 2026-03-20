import KoaRouter from 'koa-router';
import fs from 'fs';

export const LogsRouter = () => {
  const router = new KoaRouter();

  router.get('/logs/:file', async (ctx) => {
    try {
      ctx.body = fs.readFileSync(`${ctx.params.file}.log`, 'utf8');
      ctx.status = 200;
    } catch (err) {
      ctx.body = err.message;
      ctx.status = 400;
    }
  });

  router.delete('/logs/:file', async (ctx) => {
    try {
      fs.writeFileSync(`${ctx.params.file}.log`, '', 'utf8');
      ctx.body = fs.readFileSync(`${ctx.params.file}.log`, 'utf8');
      ctx.status = 200;
    } catch (err) {
      ctx.body = err.message;
      ctx.status = 400;
    }
  });

  return router;
};
