# Introduction

Portfolio Dashboard is a **self-hosted web app for tracking stock and crypto
holdings across multiple brokerage accounts**. You run it on your own machine
(or your own server), point it at your own MongoDB, and it pulls public market
data from Finnhub and NASDAQ to keep your positions current.

It is deliberately a *single-user* app: there is no sign-up, no multi-tenancy
and no hosted version. The only account system is an optional
[app lock](/features/demo-mode-and-lock) for the screen you leave open on a
second monitor.

## What you get

| Area | What it covers |
|---|---|
| [Dashboard & Today](/features/dashboard) | Every holding enriched with live price, day change, market value, gain/loss and analyst ratings; a session-aware daily view of movers |
| [Analytics](/features/analytics) | Risk metrics, allocation, performance attribution, realized gains, monthly returns, correlation, dividends, tax-loss harvesting, goal tracking |
| [Rebalance](/features/rebalance) | Target weights per symbol, drift, and the trades that close the gap |
| [Research](/features/research) | Per-ticker quote, metrics, peers, earnings history, insider transactions, news and notes — plus optional AI-written insights |
| [Alerts & notifications](/features/alerts) | Price triggers, big-move and spike alerts, breaking news, earnings and dividend reminders, daily summaries — over MQTT, with quiet hours |
| [IPO calendar](/features/ipo-calendar) | Upcoming listings, watchlist and reminders |
| [Data management](/guide/backups) | Multi-account holdings and transactions, CSV/AI-assisted import, one-click zip export and restore |

## How it is put together

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

A pnpm monorepo with two runtime packages — a React SPA and a Koa API — plus
this documentation site. **The frontend never calls a third-party service
directly**: every external request is proxied, rate-limited and cached by the
backend. The full tour lives in [Architecture](/internals/architecture).

## Where your data lives

Everything — holdings, accounts, transactions, alerts, notification config,
market-data caches — is stored in the MongoDB instance you configure via
`MONGO_URI`. Nothing is written to a service you do not control, and the entire
dataset can be exported as a zip from **Settings → Data** at any time.

## The one hard rule

**Personal financial data is never sent to an external AI provider.** Quantities,
cost basis, P&L, account names and portfolio values stay on your infrastructure.
The AI features that touch personal data are hard-locked to a local Ollama
provider; the ones that can use a hosted provider send only public market data
for a single ticker. This is enforced in the code, not just documented — see
[the AI data-privacy rule](/internals/ai-privacy).

## Requirements at a glance

- **Node ≥ 22** and **pnpm** (or Docker, if you would rather not install Node)
- A reachable **MongoDB** instance — the backend does not start without one
- A free **[Finnhub](https://finnhub.io/) API key** for market data
- *Optional:* a Claude or Gemini API key, or a local
  [Ollama](https://ollama.com/) install, for the AI features

Ready? Head to [Getting started](/guide/getting-started).
