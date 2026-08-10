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
aiProviders/   adapters with a common interface over Claude SDK / Gemini SDK /
               Ollama HTTP; chosen at runtime by AiConfig.provider
utils/         winston logger, errorBody helper
server.ts      composes middleware (CORS, helmet, raw-body for zip uploads,
               bodyparser, routers)
```

Every controller that wraps an external call caches aggressively — AI insights for 6h, company profiles and sectors for extended periods — to spare rate limits and keep the UI snappy.

## Frontend layers

```
api/               one axios client per domain; every method chains .catch(catchCustomError)
models/            TS interfaces for stored entities
pages/             route-level components (Dashboard, Research, Analytics, Database,
                   IPOCalendar, Logs, Settings)
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

## External services

| Service | Used for | Auth |
|---|---|---|
| Finnhub | quotes, recommendations, news, metrics, peers, earnings, insider, profile, IPOs | API key in `.env` |
| NASDAQ | price history (candlestick + area chart) | none |
| Anthropic | AI insights (Claude provider) | API key stored in AiConfig |
| Google Gemini | AI insights (Gemini provider) | API key stored in AiConfig |
| Ollama | AI insights (local provider) | host URL stored in AiConfig |

AI config is persisted in MongoDB, not `.env` — users configure it through the Settings UI.

## Caching

- AI insights: 6h per symbol, key `agent_insight_{SYMBOL}`.
- Live quotes and recommendations: short TTL in `LiveQuoteController` / `LiveRecommendationController` backing stores.
- IPO calendar: refreshed periodically, gated by a `CacheDBModel` key.
- Sectors and company profiles: cached per-symbol in the same cache model.

Nothing in the app is real-time streaming — the Dashboard "refresh" button is the primary interaction pattern.
