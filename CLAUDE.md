# CLAUDE.md

Context for Claude (and other AI assistants) working on this repository. Read this before starting a task. For human-facing documentation, see `docs/` — a VitePress site published to GitHub Pages. Design and theme notes live in `docs/internals/`.

## Project overview

Portfolio Dashboard: a self-hosted web app for tracking stock and crypto holdings across multiple accounts. Live market data from Finnhub and NASDAQ, optional AI-generated equity analysis via Claude / Gemini / Ollama, portfolio analytics (risk, sectors), price alerts, IPO calendar, and an import/export backup flow.

Single user, runs locally. No auth.

## AI data-privacy rule (HARD REQUIREMENT — never violate this)

**Never send personal financial data to an external AI provider (Claude API, Gemini API, or any non-local service).**

Personal financial data includes: holding quantities, cost basis, purchase prices, average prices, gain/loss amounts or percentages, portfolio dollar values, account IDs, account names, transaction history, and target prices.

The only AI feature permitted to call `getActiveProvider()` is `AgentInsightsController`, which sends **only publicly available market data** for a single ticker (company profile, price, analyst ratings, earnings, news headlines — all data that is public via Finnhub/NASDAQ). This is acceptable because it contains nothing about the user's personal position.

If Ollama is configured as the provider, data stays local. Even so, do not build features that send personal portfolio data to AI unless explicitly instructed by the user and accompanied by a prominent in-app disclosure.

**Before implementing any feature that calls `getActiveProvider()` or any AI SDK directly, ask: does the prompt contain the user's personal holdings, quantities, values, or P&L? If yes, do not build it.**

## Stack

| Layer | Tech |
|---|---|
| Monorepo | pnpm workspaces (`pnpm-workspace.yaml`) — `packages/*` plus `docs` |
| Frontend | React 19, MUI 7, Vite, TypeScript, React Router, react-toastify, ApexCharts, MUI X Charts/DataGrid, Iconify, moment, axios |
| Backend | Koa 3, TypeScript, MongoDB (centralized — see `MONGO_URI`), winston, axios, archiver/unzipper |
| AI | `@anthropic-ai/sdk`, `@google/genai`, Ollama HTTP |
| Linter/formatter | Biome |
| Node | >=22 |

## Layout

```
packages/
  frontend/
    src/
      api/            # axios clients, one per domain (dashboard, live, holdings, …)
      components/     # reusable UI; ThemeRegistry/ holds palette, theme, overrides
      pages/          # route-level components (Dashboard, Research, Analytics, …)
      models/         # TS interfaces for domain entities
      lib/            # enums and constants
      utils/          # formatters, localStorage helpers
      hooks/
      config.ts       # DB_HOST, NAV_CONFIG, DRAWER_WIDTH, etc.
    public/
      favicon.svg
      images/
  backend/
    src/
      router/         # one Koa router per domain
      controller/     # business logic
      aiProviders/    # claude / gemini / ollama adapters
      externalApis/   # finnHub.ts, nasdaq.ts
      models/         # MongoDB wrappers (MongoModel, see utils/mongoModel.ts)
      utils/          # winston logger, error.ts (errorBody)
      server.ts
docs/               # VitePress site (GitHub Pages)
  .vitepress/       # config.mts + theme
  guide/ features/ reference/ internals/
```

## Commands

From repo root:

| Task | Command |
|---|---|
| Install | `pnpm install` |
| Dev (both) | `pnpm dev` |
| Dev (one) | `pnpm dev:frontend` / `pnpm dev:backend` |
| Build | `pnpm -r build` |
| Lint | `pnpm lint` |
| Format | `pnpm format` |
| Docs site (dev / build) | `pnpm docs:dev` / `pnpm docs:build` |

The backend listens on `http://localhost:3001` by default; frontend reads `VITE_DB_HOST` (falls back to that) and stores an override in localStorage under `api_host`.

## Domain types — know these

- `IHoldings` (`frontend/src/models/HoldingsModel.ts`) — stored holding: `{ id, accountId, name, symbol, qty, averagePrice, type: 'stock' | 'crypto' }`
- `HoldingAggregate` (`frontend/src/api/dashboard.ts`) — holding enriched with live data (`currentPrice`, `percentChange`, `totalGL`, `marketValue`, analyst counts, …). **Has no `id` field** — key by `symbol` instead.
- `IAccount` — brokerage account.
- `ITransaction` — buy/sell/deposit log entry.
- `AgentInsight` / `AiConfig` (`frontend/src/api/live.ts`) — AI structured response + provider config.
- `PortfolioSnapshot` — daily total-value point used for the performance chart.

## Conventions — follow these

### Error handling (strict)

**Frontend:**
- Every API client method ends with `.catch(catchCustomError)` (from `api/apiUtil.ts`). This extracts `response.data.message` / `response.data.name` and rethrows a real `Error`.
- Every `.catch((err) => …)` at the call site **must** surface the error via `toast.error(err.message || 'Fallback message')`. Silent catches (`.catch(() => {})`) are forbidden.
- When a fetch fails, set a sensible empty state AND show a toast. Do not render "feature not configured" messaging for what is actually a load failure — pass a separate `error` prop and render a distinct error UI (e.g. `AgentInsightsCard`).
- Wrap user-triggered async actions (buttons, form submits) in `try/catch` with a toast in the catch.

**Backend:**
- Every route uses `try/catch`.
- Log errors via `logger.log({ level: 'error', message, label })` (winston; see `utils/winston.ts`).
- Return `ctx.body = errorBody(name, message)` (`utils/error.ts`) — never raw strings. The frontend's `catchCustomError` depends on this shape.
- Set `ctx.status` to `400` for client errors, `500` for server errors.
- For file-path params (e.g. `/logs/:file`), use an allowlist to prevent path traversal.

### Save buttons (strict)

**Any form input — text field, select, dropdown — persists via an explicit Save button, not onBlur or onChange auto-save.**

Pattern (see `pages/Settings.tsx` AI Agent section):
1. Keep two pieces of state: `savedX` (last persisted) and `draftX` (current edits).
2. Inputs read/write `draftX`.
3. Compute `isDirty = JSON.stringify(saved) !== JSON.stringify(draft)`.
4. Provide `Save` (disabled when `!isDirty || saving`) and `Reset` buttons.
5. Show an "Unsaved changes" indicator when dirty.
6. On save success, update `savedX` from the server response and toast success. On failure, toast the error and keep the draft for retry.

Exceptions: a standalone boolean `Switch` with immediate effect (rare) may save directly, but prefer staging it into the same draft if it sits alongside other inputs.

### Toasts

Use `react-toastify`'s `toast.error(...)` for failures and `toast.success(...)` for user-visible success. Import from `'react-toastify'`. The `ToastContainer` is mounted once globally in `App.tsx`.

### UI

- Stick to MUI components. No custom CSS beyond `global.css` and `sx` props.
- Icons via `Iconify` component wrapping `@iconify/react`.
- Currency formatting via `utils/formatNumber.ts::fnCurrency`.
- Dates via `moment`.
- Loading states use `Skeleton` from MUI, not spinners.
- Light/dark mode via `ThemeRegistry/ThemeModeContext`. Colors should come from theme tokens (`theme.palette.text.primary`, etc.), not hardcoded where avoidable — sentiment colors and brand gradients are the exception.

### Code style

- TypeScript strict. No `any` unless already pervasive in the neighboring code.
- Follow the existing error-handling and save-button patterns exactly — do not invent new patterns.
- Don't add comments explaining what code does. Only add a comment for a non-obvious *why*.
- Don't add backwards-compat shims, feature flags, or defensive checks for impossible states.
- Use `<>…</>` (shorthand fragments), never `<React.Fragment>…</React.Fragment>`.
- Prefer editing existing files over creating new ones. Don't add docs unless asked.

### Branding

- Sidebar logo and favicon share the same design: rounded square with `linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)`, white trend-line SVG on top. If you change one, update the other. Source SVG in `Drawer.tsx::LogoIcon` and `public/favicon.svg`.

## Gotchas

- `HoldingAggregate` is NOT assignable to `IHoldings` (no `id`). Components accepting "a holding-like thing" typed as `IHoldings` need `Pick<IHoldings, …>` narrowing — see `BuySellDialog.tsx`.
- All data lives in MongoDB (`MONGO_URI`/`MONGO_DB_NAME`, required — the backend does not run without a reachable Mongo). Demo Mode uses a second database, `<MONGO_DB_NAME>_demo`, on the same server — never a different `MONGO_URI`. Every model in `backend/src/models/` goes through `MongoModel` (`utils/mongoModel.ts`), which preserves skewer-db's old synchronous-read-after-async-`initialize()` contract so call sites don't need to change.
- The export/import backup flow (`/settings/db/export`, `/settings/db/import`) zips one `storage/<collection>.json` file per Mongo collection — same shape skewer-db's on-disk files used. Import is a destructive per-collection replace (delete-all + insert), not a merge.
- `pnpm run migrate:mongo` (`backend/src/scripts/migrateToMongo.ts`) migrates a pre-MongoDB `storage/` directory straight into Mongo, sharing `utils/mongoBackup.ts` with the import route. Only populates collections still empty in Mongo unless run with `--force`.
- The backend raw-body middleware for `/settings/db/import` must run BEFORE `koa-bodyparser`. Don't reorder `server.ts` middleware.
- Model name in Ollama config defaults to `llama3.1`; other providers default to their latest (`claude-sonnet-4-6`, `gemini-2.0-flash`).
- When adding a new route that takes a filename or path param, always validate against an allowlist.

## When adding a new feature

1. **Data:** add/extend a MongoDB-backed model in `backend/src/models/` (via `createStorageModel`/`MongoModel`, see existing models for the pattern) and a matching TS interface in `frontend/src/models/`.
2. **Backend:** add a `controller/` function, expose it from a new or existing `router/*.route.ts` with proper try/catch + `errorBody` + logging. Register the router in `server.ts`.
3. **Frontend API:** add a method to the matching `api/*.ts` client with `.catch(catchCustomError)`.
4. **UI:** build the component under `pages/` or `components/`. Hook up `toast.error` on failure. Use `Skeleton` for loading.
5. **Forms:** if the feature has settings-like inputs, use the draft + Save-button pattern described above.
6. **Verify:** run `pnpm -r build`. Fix any TS errors before committing.

## Git workflow

- Branch naming is enforced by the host — use the branch specified in your task prompt (`claude/…` with a matching session id).
- Commit messages: short subject, blank line, bulleted body explaining *why*. Always include the `https://claude.ai/code/session_<id>` footer when instructed.
- Never push to `main`. Never use `--no-verify`, `--force-with-lease` without explicit permission, or amend published commits.

### Version bumping (required on every commit)

**Before every commit, bump the version in all three `package.json` files, keeping them in lockstep (same version in each):**

- `package.json` (root)
- `packages/frontend/package.json`
- `packages/backend/package.json`

Pick the segment of `x.y.z` to bump using [semver](https://semver.org), based on what the *whole branch / PR* delivers (not the individual commit):

- **Major (`x`)** — a breaking change: an incompatible API/route/schema change, a removed or renamed feature, or anything that forces users to change how they use the app. Reset `y` and `z` to `0` (`2.4.1` → `3.0.0`).
- **Minor (`y`)** — a new, backward-compatible feature or capability (e.g. a new page, route, import flow, or setting). Reset `z` to `0` (`2.4.1` → `2.5.0`).
- **Patch (`z`)** — a backward-compatible bug fix, refactor, perf tweak, copy/style change, or docs-only change with no new feature (`2.4.1` → `2.4.2`).

Rules of thumb:
- If the branch adds anything a user can newly *do*, it's at least a **minor** — do not ship a feature as a patch.
- A mixed branch takes the **highest** applicable bump (a feature + bug fixes → one minor bump, not a minor and a patch).
- Bump only **once per branch relative to the base**: compute the new version from the base branch's current version, and on later commits to the same branch keep that target (don't increment again each commit). When merging the base back in, take the higher of the two versions and re-apply your intended bump on top if the base moved.
- When unsure between two segments, pick the higher one.

Do the bump as part of the same commit — do not make a separate version-bump commit.
