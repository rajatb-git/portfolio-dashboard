# Architecture

## Repository

pnpm monorepo with two workspaces:

```
packages/
  frontend/   — @portfolio/frontend (React 19 + MUI 7, Vite)
  backend/    — @portfolio/backend  (Koa 3 + TypeScript, MongoDB)
```

A single top-level `pnpm install` bootstraps both. Commands at the root fan out (`pnpm -r build`, `pnpm dev`).

## Runtime topology

- **Frontend** serves a SPA. In dev, Vite on a local port. In production, static files served by any HTTP server.
- **Backend** is a Koa app on port `3001` by default. Frontend points at it via `VITE_DB_HOST` or a localStorage override (`api_host`, set in Settings).
- **Data** lives in MongoDB — a central instance the backend connects to via `MONGO_URI`/`MONGO_DB_NAME` (see `.env.example`). One Mongo collection per model, same names skewer-db's on-disk files used before this migration. Demo Mode uses a second database (`<MONGO_DB_NAME>_demo`) on the same server.
- **External APIs** are called from the backend only; the frontend never talks to Finnhub/NASDAQ/AI providers directly.

## Backend layers

```
router/        thin Koa routers — parse params, call controllers, catch errors,
               return structured responses via errorBody()
controller/    business logic — orchestrate models + external APIs + caches
models/        MongoDB wrappers (MongoModel, utils/mongoModel.ts) — one file per
               collection (Accounts, Holdings, Transactions, Alerts, AiConfig,
               PortfolioSnapshot, Cache, etc.)
externalApis/  adapters for Finnhub and NASDAQ; all log-and-rethrow on failure
marketData/    every Finnhub call: budget + lanes, the market data store, and the
               refresh scheduler (see "Market data" below)
aiProviders/   adapters with a common interface over Claude SDK / Gemini SDK /
               Ollama HTTP; chosen at runtime by AiConfig.provider
middleware/    auth — verifies the app-lock session token when the lock is on
utils/         winston logger, errorBody helper
server.ts      composes middleware (CORS, raw-body for zip uploads, bodyparser,
               helmet, auth, routers) and starts the background services
```

Public market data never comes straight from Finnhub on a request path — it is read from the market data store (below). AI insights are cached for 6h per symbol on top of that.

## Market data

Finnhub's free plan allows 60 calls a minute (and 30 a second) for the whole
app, so every Finnhub call goes through one layer in `backend/src/marketData/`:

```
finnhubClient.ts  the budget. Two lanes share it: `user` (someone is waiting —
                  always served first) and `background` (only while 20 calls of
                  the minute stay unspent). Every request has a deadline and
                  fails fast with FinnhubBusyError rather than queueing for a
                  minute. Synced from Finnhub's x-ratelimit-* headers; a 429
                  pauses every call until Finnhub's window resets.
datasets.ts       each kind of data (quote, recommendation, profile, metrics,
                  peers, next earnings, earnings history, insider, news, market
                  status): its fetcher and how long a copy stays fresh.
store.ts          read(dataset, key, { mode }) over the `market_data` collection,
                  held in memory. `cached` never waits; `fresh` fetches on the
                  user lane for at most ~3s, then serves what is stored; `force`
                  is the refresh button. Market data is public, so it always
                  lives in the real database and Demo Mode shares it.
scheduler.ts      keeps what someone needs fresh, spending only the background
                  lane: every held symbol (quote plus everything Research shows),
                  alert symbols, index quotes, whatever was opened on Research in
                  the last 15 minutes, and anything a read found missing.
```

A read that finds nothing stored answers *pending*: the dashboard marks those
rows `pricePending` and polls every 3s until they fill; Research endpoints
answer `202` and the frontend client (`getUntilReady`) asks again. Quote
cadence scales with how many symbols are watched (about 20 quotes a minute, so
~2 minutes for 30–40 symbols); outside every session a quote taken after the
close is kept until the next pre-market. `GET /health/market-data` shows the
budget, the scheduler backlog and anything failing.

## Frontend layers

```
api/               one axios client per domain; every method chains .catch(catchCustomError)
models/            TS interfaces for stored entities
pages/             route-level components (Dashboard, Today, Analytics, Rebalance,
                   Research, Alerts, Notifications, IPOCalendar, IPODetail,
                   Database, Logs, Changelog, Settings)
components/        reusable UI. Notables:
  ThemeRegistry/     palette + theme + MUI overrides + dark/light context
  Nav/Drawer.tsx     sidebar + top app bar + command-K search
  DashboardTable/    filterable, sortable holdings table
  Analytics/         charts and cards for the analytics page
  Research/          per-ticker research cards (insights, earnings, insider)
  BuySellDialog.tsx  single dialog for both buy and sell
lib/               enums (HoldingTypesEnum) and constants
utils/             formatNumber, localStorage helpers
config.ts          DB_HOST, NAV_CONFIG, drawer widths
```

Pages fetch on mount and on param change; loading states use MUI `Skeleton`, failures raise toasts.

## Background services

Beyond request/response, the backend runs a set of long-lived services started
in `server.ts` after `listen()`. Each reads its own config document from
MongoDB, reschedules itself when that config is saved (no restart needed), and
records its last run in `job_run_state` so a restart does not replay alerts.

```
MarketDataScheduler          keeps held / viewed / alert market data fresh (see above)
AlertMonitorService          evaluates saved price alerts
MoveAlertService             day-change thresholds, escalation and spike windows
NewsWatchService             breaking headlines for holdings and the market
EarningsReminderService      pre-report reminders and post-report results
DividendWatchService         ex-dividend and payment date reminders
IpoReminderService           watched IPOs approaching their date
IpoAnnouncementService       newly listed IPOs on the calendar
TradingSummaryService        morning / midday / close portfolio recaps
PortfolioValueCalcService    periodic total-value snapshots
ScheduledBackupService       periodic export zips with retention
QuietHoursService            holds or drops notifications inside a window
```

All of them publish through `NotificationDispatcher`, which applies quiet hours,
records the send in `notification_history`, and hands the payload to
`MqttPublisher` — a single persistent MQTT client with auto-reconnect whose
failures are logged, never thrown. A dead broker degrades notifications, not the
app.

## Key data flows

### Dashboard render
1. Frontend `Dashboard.tsx` calls `apis.dashboard.getDashboard()` → `GET /dashboard`.
2. `DashboardController.createDashboard` reads all holdings, fetches live quotes and recommendations in parallel for unique symbols (via Finnhub with Promise.all), computes per-row aggregates, and writes today's total value snapshot to `PortfolioSnapshotDBModel`.
3. Response is an array of `HoldingAggregate` (one row per holding with enriched fields). Holdings whose live data fetch fails are skipped rather than failing the whole response.

### Research page → AI insights
1. User navigates to `/research?searchText=SYMBOL`.
2. Seven independent fetches fire in parallel (quote, recommendation, news, metrics, peers, earnings, earnings history, insider transactions).
3. If `AiConfig.enabled`, frontend also calls `GET /live/agent-insights/:sym`.
4. `AgentInsightsController.getInsights` checks a 6h cache, otherwise builds a ~2K-token prompt from seven backend data sources, dispatches to the configured provider, parses strict JSON, caches, and returns.

### Database backup
1. Export: frontend hits `GET /settings/db/export`. Backend enumerates every Mongo collection and streams a zip via `archiver`, one `storage/<collection>.json` entry per collection (shape `{ [id]: record }`).
2. Import: frontend PUTs the raw zip body to `/settings/db/import`. A dedicated raw-body middleware (registered before `koa-bodyparser` in `server.ts`) captures it. Backend parses and validates every entry first, snapshots current state as a safety backup, then restores each collection (delete-all + insert) — a destructive per-collection replace, not a merge. A confirmation dialog in the UI guards against accidental overwrites.
3. First-time migration from a pre-MongoDB build: `pnpm run migrate:mongo` (`backend/src/scripts/migrateToMongo.ts`) reads skewer-db's old `storage/*.json` files straight off disk into Mongo, sharing the same parse/write logic as import above (`utils/mongoBackup.ts`). Doesn't need the old server running; only populates collections still empty in Mongo unless run with `--force`.

## External services

| Service | Used for | Auth |
|---|---|---|
| Finnhub | quotes, recommendations, news, metrics, peers, earnings, insider, profile, IPOs | API key in `.env` |
| NASDAQ | price history (candlestick + area chart) | none |
| Anthropic | AI insights (Claude provider) | API key stored in AiConfig |
| Google Gemini | AI insights (Gemini provider) | API key stored in AiConfig |
| Ollama | AI insights (local provider) | host URL stored in AiConfig |

AI config is persisted in MongoDB, not `.env` — users configure it through the Settings UI.

Which provider a feature may use is not a preference but an invariant:
ticker and IPO insights (public data only) go through `getActiveProvider()`;
portfolio insights and AI document import (personal data) construct
`OllamaProvider` directly and refuse to run against a hosted API. See
[the AI data-privacy rule](./ai-privacy.md).

## Caching

- AI insights: 6h per symbol, key `agent_insight_{SYMBOL}`.
- Market data (quotes, recommendations, profiles, metrics, news, …): the `market_data` store, freshness per dataset in `marketData/datasets.ts`.
- IPO calendar: refreshed periodically, gated by a `CacheDBModel` key.

Nothing in the app is real-time streaming — the Dashboard "refresh" button is the primary interaction pattern.
