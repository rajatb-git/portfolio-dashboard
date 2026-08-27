# Dashboard & Today

Two views of the same positions: **Dashboard** is the complete picture,
**Today** is what changed since the open.

## Dashboard

The default landing page. One row per holding, across every account, enriched
in real time.

| Column group | What it shows |
|---|---|
| Position | Symbol, name, account, type (`stock` / `crypto`), quantity, average price |
| Live | Current price, day change (% and $) |
| Value | Market value, total gain/loss in dollars and percent |
| Street view | Analyst recommendation counts — strong buy / buy / hold / sell |

The table is filterable and sortable, its density and default page size come
from **Settings → Dashboard**, and a refresh control re-fetches everything on
demand.

Alongside the table sits an **upcoming earnings** card, so a report landing
this week on something you hold is visible without leaving the page.

From any row you can open the **Buy / Sell** dialog, which writes a transaction,
updates the position's quantity and average price, and adjusts the account's
cash balance in one step.

::: tip Press ⌘K / Ctrl-K
The command palette jumps to any page or looks up a ticker without touching the
sidebar.
:::

### How a row is built

`GET /dashboard` reads every holding, fetches quotes and recommendations for the
unique symbols in parallel, computes the aggregates, and writes today's total
portfolio value as a snapshot for the performance chart. Holdings whose live
fetch fails are skipped rather than failing the whole response — which is what
you are seeing if a row loses its price during heavy rate-limiting.

## Today

A session-aware daily view. Its central point is that "today's change" means
different things at different hours, so the page tells you **which trading
session the numbers reflect** — pre-market, regular hours, after-hours or the
last close — instead of quietly showing a stale number.

It covers:

- **Market Movement** — how the broad market is doing right now
- **Your Top Gainers / Top Losers** — your positions, ranked by the session's move
- **Market Top Gainers / Top Losers** — the same for the market as a whole,
  refreshable independently

The dashboard also exposes a **daily recap** and a **brief** endpoint
(`/dashboard/daily-recap`, `/dashboard/brief`) — the same summaries the
[daily trading summary notification](/features/alerts) is built from.

## Related

- [Analytics](/features/analytics) — the longer-horizon view of the same data
- [Rebalance](/features/rebalance) — what to do about the weights you see here
- [REST API](/reference/rest-api#dashboard) — the endpoints behind both pages
