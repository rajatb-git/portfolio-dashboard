<div align="center">

<img src="docs/public/logo.svg" alt="Portfolio Dashboard" width="88" height="88" />

# Portfolio Dashboard

**A self-hosted dashboard for tracking stock and crypto holdings across every account you own.**

Live market data · portfolio analytics · rebalancing · price and news alerts · IPO calendar · optional AI equity research — all running on your own hardware, against your own database.

[![CI](https://github.com/rajatb-git/portfolio-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/rajatb-git/portfolio-dashboard/actions/workflows/ci.yml)
[![Docs](https://github.com/rajatb-git/portfolio-dashboard/actions/workflows/docs.yml/badge.svg)](https://github.com/rajatb-git/portfolio-dashboard/actions/workflows/docs.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-5FA04E?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**[Documentation](https://rajatb-git.github.io/portfolio-dashboard/)** ·
[Getting started](https://rajatb-git.github.io/portfolio-dashboard/guide/getting-started.html) ·
[Docker](https://rajatb-git.github.io/portfolio-dashboard/guide/docker.html) ·
[REST API](https://rajatb-git.github.io/portfolio-dashboard/reference/rest-api.html) ·
[Contributing](CONTRIBUTING.md)

</div>

---

Portfolio Dashboard is a single-user app you run yourself. There is no hosted
service, no sign-up and no third party holding your positions: it stores
everything in a MongoDB instance you control, pulls public market data from
Finnhub and NASDAQ, and hands the entire dataset back to you as a zip whenever
you ask.

## Highlights

- **📊 Live portfolio view** — every holding across every account, enriched in
  real time with price, day change, market value, gain/loss and analyst ratings.
  A session-aware **Today** page tells you *which* trading session the numbers
  reflect instead of quietly showing a stale figure.
- **📈 Deep analytics** — risk metrics (volatility, Sharpe, max drawdown, beta),
  sector and asset allocation, performance attribution, realized gains split
  short/long-term, monthly return grid, correlation matrix with a
  diversification score, dividend income and yield on cost, tax-loss harvesting
  candidates with wash-sale flags, and goal tracking with projections.
- **⚖️ Rebalancing** — set target weights and get drift, the dollar trade and
  the approximate share count that closes the gap.
- **🔎 Ticker research** — quote, fundamentals, peers, earnings history, insider
  transactions, news and your own notes on one page, with an optional
  AI-written synthesis.
- **🔔 Alerts that reach you** — four price-alert conditions (fixed target,
  trailing stop, % from 52-week high, cost basis), big-move and intraday spike
  detection with escalation, breaking-news watching, earnings and dividend
  reminders, IPO alerts and daily recaps — published over **MQTT**, with quiet
  hours and a full notification history.
- **🗂 Multi-account & imports** — accounts with cash balances, buy/sell/deposit
  transaction logging, generic CSV import, native parsers for **Robinhood,
  Schwab and Fidelity** exports, and AI-assisted parsing of PDF statements
  (local model only).
- **💾 Backups you own** — one-click export/import of the entire database as a
  zip, plus scheduled backups with retention.
- **🔒 Private by design** — personal financial data is **never** sent to an
  external AI provider. That is enforced in code, not just promised.
- **🎨 Polished UI** — MUI 7, light/dark themes, ⌘K command palette, responsive,
  installable as a PWA.

> **Screenshots:** flip on **Demo Mode** in Settings — it seeds a realistic
> generated portfolio into a separate database so you can explore every screen
> without entering a single real number.

## Quick start

**Prerequisites:** Node ≥ 22, pnpm, a reachable MongoDB, and a free
[Finnhub](https://finnhub.io/) API key.

```sh
git clone https://github.com/rajatb-git/portfolio-dashboard.git
cd portfolio-dashboard
pnpm install

cp packages/backend/.env.example packages/backend/.env
# add MONGO_URI and FINN_HUB_API_KEY

pnpm dev
```

Frontend on `http://localhost:5173`, API on `http://localhost:3001`.

### Or with Docker

```sh
export MONGO_URI="mongodb://user:password@your-mongo-host:27017"
export FINN_HUB_API="https://finnhub.io/api/v1"
export FINN_HUB_API_KEY="your_key"

docker compose up -d
```

Frontend on `http://localhost:3000`, API on `http://localhost:3001`. Multi-arch
images (`amd64` / `arm64`) are published to GHCR on every release.

Full walkthrough: **[Getting started](https://rajatb-git.github.io/portfolio-dashboard/guide/getting-started.html)**.

## Documentation

Everything lives at
**[rajatb-git.github.io/portfolio-dashboard](https://rajatb-git.github.io/portfolio-dashboard/)**
(source in [`docs/`](docs/)):

| Section | Contents |
|---|---|
| [Guide](https://rajatb-git.github.io/portfolio-dashboard/guide/introduction.html) | Install, configure, deploy, import data, back up, troubleshoot |
| [Features](https://rajatb-git.github.io/portfolio-dashboard/features/dashboard.html) | One page per feature, with the defaults and edge cases |
| [Reference](https://rajatb-git.github.io/portfolio-dashboard/reference/rest-api.html) | Full REST API, environment variables, data models, background services, commands |
| [Internals](https://rajatb-git.github.io/portfolio-dashboard/internals/architecture.html) | Architecture, error-handling contract, UI conventions, design system |

## Architecture

```
┌────────────────────────────┐       ┌────────────────────────────┐
│   React 19 + MUI 7 (Vite)  │──────▶│   Koa 3 + TypeScript       │
│   packages/frontend        │ HTTP  │   packages/backend         │
└────────────────────────────┘       └─────┬──────────────────────┘
                                           │
                        ┌──────────────────┼───────────────────┐
                        ▼                  ▼                   ▼
                 MongoDB            Finnhub / NASDAQ     Claude / Gemini /
                 (MONGO_URI)        (market data)        Ollama (AI, opt-in)
```

The frontend never talks to a third-party service directly — every external
call is proxied, rate-limited and cached by the backend, which also runs a dozen
scheduled services for alerts, snapshots and backups. Full write-up in
[Architecture](https://rajatb-git.github.io/portfolio-dashboard/internals/architecture.html).

## Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, MUI 7, Vite, TypeScript, React Router, ApexCharts, MUI X Charts/DataGrid, FullCalendar, Iconify, axios |
| **Backend** | Koa 3, TypeScript, MongoDB, winston, MQTT, archiver/unzipper |
| **AI** | `@anthropic-ai/sdk` (Claude), `@google/genai` (Gemini), Ollama — pluggable at runtime |
| **Market data** | Finnhub (quotes, fundamentals, news, IPOs), NASDAQ (price history) |
| **Tooling** | pnpm workspaces, Biome, VitePress, Docker Compose, GitHub Actions, Node ≥ 22 |

## Project structure

```
packages/
  frontend/   React 19 + MUI SPA (Vite)
    src/api/         one axios client per domain
    src/pages/       route-level screens
    src/components/  reusable UI + ThemeRegistry
  backend/    Koa 3 API
    src/router/       thin Koa routers
    src/controller/   business logic, caching, background services
    src/models/       MongoDB collection wrappers
    src/aiProviders/  Claude / Gemini / Ollama adapters
    src/externalApis/ Finnhub + NASDAQ adapters
docs/         VitePress documentation site (published to GitHub Pages)
```

## Privacy

**Personal financial data is never sent to an external AI provider.** Holding
quantities, cost basis, P&L, account names and portfolio values stay on your
infrastructure.

- Features that need your positions — portfolio insights, AI statement import —
  are **hard-locked to a local Ollama provider** and refuse to run against a
  hosted API.
- Features that may use Claude or Gemini — ticker and IPO insights — send **only
  publicly available market data for a single symbol**, nothing about your
  position in it.

The rule, and how it is enforced, is documented in
[the AI data-privacy rule](https://rajatb-git.github.io/portfolio-dashboard/internals/ai-privacy.html)
and in [`CLAUDE.md`](CLAUDE.md).

## Engineering notes

A few decisions worth calling out for anyone reading the code:

- **A strict error-handling contract.** Every backend route returns a structured
  `errorBody`; every frontend API method rethrows a real `Error` the UI surfaces
  as a toast. No silent catches. See
  [Error handling](https://rajatb-git.github.io/portfolio-dashboard/internals/error-handling.html).
- **Aggressive caching** of external calls (AI insights 6h, profiles and sectors
  longer) to respect rate limits and keep the UI responsive.
- **Consistent form UX** — every input persists behind an explicit Save button
  with dirty-state tracking, never silent auto-save.
- **Resilient background jobs** — a summary whose slot passed while the server
  was down is delivered on the next start rather than skipped forever.

## Contributing

Bug reports, features, docs and tests are all welcome. Start with
[CONTRIBUTING.md](CONTRIBUTING.md), which covers the setup, the coding
conventions, the version-bump rule and the one non-negotiable privacy boundary.

Security issues: please follow [SECURITY.md](SECURITY.md) rather than opening a
public issue.

## License

[MIT](LICENSE) © Rajat Bansal

## Author

**Rajat Bansal** — [@rajatb-git](https://github.com/rajatb-git)
