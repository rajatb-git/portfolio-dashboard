# Portfolio Dashboard

A self-hosted web app for tracking stock and crypto holdings across multiple
accounts — with live market data, portfolio analytics, price alerts, an IPO
calendar, and optional AI-generated equity research.

Built as a full-stack TypeScript monorepo: **React 19 + MUI 7** on the front,
**Koa 3** on the back, an embedded file-based document store, and adapters for
three market-data and three AI providers.

<!--
Screenshots: drop PNGs into docs/images/ and uncomment the block below.
Recommended shots: dashboard, analytics, research (AI insights), IPO calendar.

<p align="center">
  <img src="docs/images/dashboard.png" alt="Dashboard" width="800" />
</p>
<p align="center">
  <img src="docs/images/analytics.png" alt="Analytics" width="400" />
  <img src="docs/images/research.png"  alt="Research"  width="400" />
</p>
-->

> **Screenshots coming soon** — run the app locally (see below) to try it live.

---

## Features

- **Dashboard** — every holding enriched in real time with current price, day
  change, total gain/loss, market value, and analyst ratings; filterable and
  sortable.
- **Today** — a session-aware daily view that tells you which trading session
  the numbers reflect when the market is closed.
- **Analytics** — portfolio-level risk, sector allocation, and a performance
  chart backed by daily value snapshots.
- **Research** — per-ticker deep dive: quote, recommendations, news, metrics,
  peers, earnings history, insider transactions, and an **AI-generated
  insight** synthesized from all of it.
- **Alerts** — price alerts per symbol.
- **IPO Calendar** — upcoming IPOs with a detail view.
- **Multi-account** — group holdings by brokerage account, log buy/sell/deposit
  transactions.
- **Backups** — one-click export/import of the entire dataset as a zip, plus
  scheduled backups.
- **Light / dark mode**, command-K search, and a fully responsive MUI UI.

## Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, MUI 7, Vite, TypeScript, React Router, ApexCharts, MUI X Charts/DataGrid, Iconify, axios |
| **Backend** | Koa 3, TypeScript, SkewerDB (embedded document DB), winston, archiver/unzipper |
| **AI** | `@anthropic-ai/sdk` (Claude), `@google/genai` (Gemini), Ollama (local) — pluggable at runtime |
| **Market data** | Finnhub (quotes, fundamentals, IPOs), NASDAQ (price history) |
| **Tooling** | pnpm workspaces, Biome (lint + format), Docker Compose, Node ≥ 22 |

## Architecture

```
┌────────────────────────────┐       ┌────────────────────────────┐
│   React 19 + MUI 7 (Vite)  │──────▶│   Koa 3 + TypeScript       │
│   packages/frontend        │ HTTP  │   packages/backend         │
└────────────────────────────┘       └─────┬──────────────────────┘
                                           │
                        ┌──────────────────┼───────────────────┐
                        ▼                  ▼                   ▼
                 SkewerDB files     Finnhub / NASDAQ     Claude / Gemini /
                 (./storage)        (market data)        Ollama (AI)
```

The frontend never talks to external services directly — every third-party
call is proxied and cached by the backend. Full write-up in
[`docs/architecture.md`](docs/architecture.md).

## Getting started

### Prerequisites

- Node ≥ 22 and [pnpm](https://pnpm.io/)
- A free [Finnhub](https://finnhub.io/) API key (required for market data)
- *(Optional)* a Claude or Gemini API key, or a local Ollama install, for AI
  research — configured in-app under **Settings**, not in env files.

### Run locally

```sh
# 1. Install
pnpm install

# 2. Configure the backend
cp packages/backend/.env.example packages/backend/.env
#    then edit packages/backend/.env and add your FINN_HUB_API_KEY

# 3. Start both packages
pnpm dev
```

Frontend on `http://localhost:5173` (Vite), backend API on
`http://localhost:3001`. The frontend targets the backend via `VITE_DB_HOST`
(defaults to `http://localhost:3001`; also overridable in-app under Settings).

### Run with Docker Compose

```sh
docker compose up -d
```

Frontend on `http://localhost:3000`, backend on `http://localhost:3001`.
Storage persists to a named Docker volume. Pass your Finnhub key via the
environment (see `docker-compose.yml` and `packages/backend/.env.example`).

### Common commands

| Task | Command |
|---|---|
| Dev (both) | `pnpm dev` |
| Dev (one) | `pnpm dev:frontend` / `pnpm dev:backend` |
| Build all | `pnpm -r build` |
| Lint | `pnpm lint` |
| Format | `pnpm format` |

## Project structure

```
packages/
  frontend/   React 19 + MUI SPA (Vite)
    src/api/         one axios client per domain
    src/pages/       route-level screens
    src/components/  reusable UI + ThemeRegistry
  backend/    Koa 3 API
    src/router/       thin Koa routers
    src/controller/   business logic + caching
    src/models/       SkewerDB collection wrappers
    src/aiProviders/  Claude / Gemini / Ollama adapters
    src/externalApis/ Finnhub + NASDAQ adapters
docs/         architecture, design system, UI + error-handling conventions
```

## Engineering notes

A few decisions worth calling out for anyone reading the code:

- **A hard data-privacy boundary.** Personal financial data (quantities, cost
  basis, P&L, account names, dollar values) is *never* sent to an external AI
  provider. Only the AI research feature calls a provider, and it sends only
  publicly available market data for a single ticker. The rule is enforced in
  review and documented in [`CLAUDE.md`](CLAUDE.md).
- **A strict error-handling contract.** Every backend route returns a
  structured `errorBody` shape; every frontend API method rethrows a real
  `Error` the UI surfaces as a toast. No silent catches. See
  [`docs/error-handling.md`](docs/error-handling.md).
- **Aggressive caching** of external calls (AI insights 6h, profiles/sectors
  longer) to respect rate limits and keep the UI snappy.
- **Consistent form UX** — every input persists behind an explicit Save button
  with dirty-state tracking, never silent auto-save.

## License

[MIT](LICENSE) © Rajat Bansal

## Author

**Rajat Bansal**

- GitHub: [@rajatb-git](https://github.com/rajatb-git)
<!-- Add more links as you like:
- LinkedIn: https://www.linkedin.com/in/your-handle
- Website:  https://your-site.dev
-->
