import * as dotenv from 'dotenv';

dotenv.config();

import { ensureStorageCwd } from './utils/storage';

ensureStorageCwd();

import './utils/storageRepair';
import cors from '@koa/cors';
import Koa from 'koa';
import KoaBodyParser from 'koa-bodyparser';
import KoaHelmet from 'koa-helmet';

import { authMiddleware } from './middleware/auth';
import { portfolioValueCalcService } from './controller/PortfolioValueCalcService';
import { getValueCalcConfig } from './models/ValueCalcConfigModel';
import { AccountsRouter } from './router/accounts.route';
import { AnalyticsRouter } from './router/analytics.route';
import { AuthRouter } from './router/auth.route';
import { DashboardRouter } from './router/dashboard.route';
import { HealthRouter } from './router/health.route';
import { HoldingsRouter } from './router/holdings.route';
import { LiveRouter } from './router/live.route';
import { LogsRouter } from './router/logs.route';
import { SettingsRouter } from './router/settings.route';
import { TransactionsRouter } from './router/transactions.route';
import { WatchlistRouter } from './router/watchlist.route';

const app = new Koa();
app.use(cors());
// Raw body parser for zip uploads — must run before koa-bodyparser
app.use(async (ctx, next) => {
  if (ctx.path === '/settings/db/import' && ctx.method === 'POST') {
    const chunks: Buffer[] = [];
    for await (const chunk of ctx.req) {
      chunks.push(chunk);
    }
    (ctx.request as any).body = Buffer.concat(chunks);
    return next();
  }
  return next();
});
app.use(KoaBodyParser());
app.use(KoaHelmet());
app.use(authMiddleware);

const port = process.env.PORT || 3001;

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
});

app.use(HealthRouter().routes()).use(HealthRouter().allowedMethods());
app.use(AuthRouter().routes()).use(AuthRouter().allowedMethods());
app.use(HoldingsRouter().routes()).use(HoldingsRouter().allowedMethods());
app.use(AccountsRouter().routes()).use(AccountsRouter().allowedMethods());
app.use(LiveRouter().routes()).use(LiveRouter().allowedMethods());
app.use(DashboardRouter().routes()).use(DashboardRouter().allowedMethods());
app.use(TransactionsRouter().routes()).use(TransactionsRouter().allowedMethods());
app.use(LogsRouter().routes()).use(LogsRouter().allowedMethods());
app.use(WatchlistRouter().routes()).use(WatchlistRouter().allowedMethods());
app.use(AnalyticsRouter().routes()).use(AnalyticsRouter().allowedMethods());
app.use(SettingsRouter().routes()).use(SettingsRouter().allowedMethods());

app.listen(port, () => {
  console.log('server started on port ' + port);
  getValueCalcConfig().then((config) => portfolioValueCalcService.start(config));
});
