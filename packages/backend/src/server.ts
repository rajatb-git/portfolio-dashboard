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
import { alertMonitorService } from './controller/AlertMonitorService';
import { ipoAnnouncementService } from './controller/IpoAnnouncementService';
import { ipoReminderService } from './controller/IpoReminderService';
import { moveAlertService } from './controller/MoveAlertService';
import { configureFromSaved } from './controller/NotificationDispatcher';
import { portfolioValueCalcService } from './controller/PortfolioValueCalcService';
import { scheduledBackupService } from './controller/ScheduledBackupService';
import { tradingSummaryService } from './controller/TradingSummaryService';
import { getAlertMonitorConfig } from './models/AlertMonitorConfigModel';
import { getIpoAnnouncementConfig } from './models/IpoAnnouncementConfigModel';
import { getIpoReminderConfig } from './models/IpoReminderConfigModel';
import { getMoveAlertConfig } from './models/MoveAlertConfigModel';
import { getScheduledBackupConfig } from './models/ScheduledBackupConfigModel';
import { getTradingSummaryConfig } from './models/TradingSummaryConfigModel';
import { getValueCalcConfig } from './models/ValueCalcConfigModel';
import { AccountsRouter } from './router/accounts.route';
import { AiImportRouter } from './router/aiImport.route';
import { AlertsRouter } from './router/alerts.route';
import { AnalyticsRouter } from './router/analytics.route';
import { AuthRouter } from './router/auth.route';
import { DashboardRouter } from './router/dashboard.route';
import { DatabaseRouter } from './router/database.route';
import { HealthRouter } from './router/health.route';
import { HoldingsRouter } from './router/holdings.route';
import { LiveRouter } from './router/live.route';
import { LogsRouter } from './router/logs.route';
import { NotesRouter } from './router/notes.route';
import { RebalanceRouter } from './router/rebalance.route';
import { SettingsRouter } from './router/settings.route';
import { TransactionsRouter } from './router/transactions.route';

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
app.use(AnalyticsRouter().routes()).use(AnalyticsRouter().allowedMethods());
app.use(RebalanceRouter().routes()).use(RebalanceRouter().allowedMethods());
app.use(SettingsRouter().routes()).use(SettingsRouter().allowedMethods());
app.use(NotesRouter().routes()).use(NotesRouter().allowedMethods());
app.use(AlertsRouter().routes()).use(AlertsRouter().allowedMethods());
app.use(AiImportRouter().routes()).use(AiImportRouter().allowedMethods());
app.use(DatabaseRouter().routes()).use(DatabaseRouter().allowedMethods());

app.listen(port, () => {
  console.log('server started on port ' + port);
  getValueCalcConfig().then((config) => portfolioValueCalcService.start(config));
  getAlertMonitorConfig().then((config) => alertMonitorService.start(config));
  getScheduledBackupConfig().then((config) => scheduledBackupService.start(config));
  getMoveAlertConfig().then((config) => moveAlertService.start(config));
  getIpoReminderConfig().then((config) => ipoReminderService.start(config));
  configureFromSaved().then(() => {
    getTradingSummaryConfig().then((config) => tradingSummaryService.start(config));
    getIpoAnnouncementConfig().then((config) => ipoAnnouncementService.start(config));
  });
});
