# REST API reference

The backend is a plain Koa HTTP API. Everything the UI does goes through these
routes, which means anything you can do in the app you can script.

**Base URL:** `http://localhost:3001` by default (`PORT` to change it).

::: tip PUT creates, POST updates
This codebase uses `PUT /<collection>` to **insert** a new record and
`POST /<collection>` to **update or upsert** an existing one. It is the inverse
of the more common convention — worth knowing before you script against it.
:::

## Conventions

**Errors** are always a structured body, never a bare string:

```json
{ "name": "Failed to insert holding", "message": "symbol is required" }
```

with `400` for client errors and `500` for server errors. The full contract is
in [Error handling](/internals/error-handling).

**Authentication** is off unless you enable the
[app lock](/features/demo-mode-and-lock). When it is on, every request needs
`Authorization: Bearer <token>` from `POST /auth/unlock`; `/health`, `/auth/*`
and `GET /settings/lock` stay open.

**Response headers** include `X-Response-Time` on every request.

## Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check. Never requires auth |

## Auth

| Method | Path | Description |
|---|---|---|
| `GET` | `/auth/status` | Whether the lock is enabled and the session valid |
| `POST` | `/auth/unlock` | Exchange a passcode for a session token. Rate-limited: 5 attempts/minute, then a 5-minute lockout |
| `POST` | `/auth/lock` | End the session |

## Dashboard

| Method | Path | Description |
|---|---|---|
| `GET` | `/dashboard` | Every holding enriched with live price, day change, market value, gain/loss and analyst counts |
| `GET` | `/dashboard/daily-recap` | The day's summary for your portfolio |
| `GET` | `/dashboard/brief` | Condensed portfolio brief |
| `GET` | `/portfolio/snapshots` | Daily total-value points behind the performance chart |

## Holdings

| Method | Path | Description |
|---|---|---|
| `PUT` | `/holdings` | Create a holding |
| `GET` | `/holdings` | List all holdings |
| `GET` | `/holdings/:id` | One holding by id |
| `GET` | `/holdings/symbol/:symbol` | Holdings for a symbol, across accounts |
| `POST` | `/holdings` | Update / upsert a holding |
| `DELETE` | `/holdings/:id` | Delete a holding |
| `POST` | `/holdings/buy` | Record a buy — updates position, average price and account cash |
| `POST` | `/holdings/sell` | Record a sell — updates position, realizes P&L and account cash |
| `POST` | `/holdings/import` | Bulk import. A row with symbol `CASH` adjusts the account balance instead of creating a position |

## Accounts

| Method | Path | Description |
|---|---|---|
| `PUT` | `/accounts` | Create an account |
| `GET` | `/accounts` | List accounts |
| `GET` | `/accounts/:id` | One account |
| `POST` | `/accounts` | Update / upsert an account |
| `POST` | `/accounts/:id/cash` | Deposit or withdraw cash |
| `DELETE` | `/accounts/:id` | Delete an account |

## Transactions

| Method | Path | Description |
|---|---|---|
| `PUT` | `/transactions` | Create a transaction |
| `GET` | `/transactions` | List transactions |
| `GET` | `/transactions/:id` | One transaction |
| `GET` | `/transactions/symbol/:symbol` | Transactions for a symbol |
| `POST` | `/transactions` | Update / upsert |
| `POST` | `/transactions/import` | Bulk import. Requires `qty` and `action` (`buy`/`sell`/`deposit`/`withdraw`); validates every row before writing |
| `DELETE` | `/transactions` | Delete by `id` in the body — also reverses the cash impact |

## Live market data

All of these are proxied, rate-limited and cached by the backend; the browser
never calls Finnhub or NASDAQ directly.

| Method | Path | Description |
|---|---|---|
| `GET` | `/live/quote/:sym` | Current quote |
| `GET` | `/live/recommendation/:sym` | Analyst recommendation counts |
| `GET` | `/live/news/:sym` | Company news |
| `GET` | `/live/history/:sym` | Price history (NASDAQ) |
| `GET` | `/live/company-profile/:sym` | Company profile |
| `GET` | `/live/search` | Symbol search |
| `GET` | `/live/metrics/:sym` | Fundamentals |
| `GET` | `/live/peers/:sym` | Peer tickers |
| `GET` | `/live/earnings/:sym` | Upcoming earnings |
| `GET` | `/live/earnings-history/:sym` | Reported vs estimated EPS |
| `GET` | `/live/insider/:sym` | Insider transactions |
| `GET` | `/live/agent-insights/:sym` | AI insight for a ticker — public data only, cached 6h |
| `GET` | `/live/market-news` | Broad market headlines |
| `GET` | `/live/portfolio-news` | Headlines filtered to your holdings |
| `GET` | `/live/market-movers` | Market-wide gainers and losers |
| `GET` | `/live/market-status` | Which trading session is currently in effect |
| `GET` | `/live/portfolio-sentiment` | Aggregate news sentiment across holdings |
| `GET` | `/live/ipos` | IPO calendar |
| `POST` | `/live/ipo-insights` | AI insight for an offering — public data only |
| `PUT` | `/live/ipos/:symbol/watch` | Watch an IPO |
| `DELETE` | `/live/ipos/:symbol/watch` | Unwatch |

## Analytics

| Method | Path | Description |
|---|---|---|
| `GET` | `/analytics/risk` | Annualized return, volatility, Sharpe, max drawdown, beta |
| `GET` | `/analytics/sectors` | Sector allocation |
| `GET` | `/analytics/performance-attribution` | Per-holding contribution to return |
| `GET` | `/analytics/realized-gains` | Closed lots, short/long-term, by year |
| `GET` | `/analytics/earnings-calendar` | Upcoming earnings for your holdings |
| `GET` | `/analytics/dividends` | Income, yield, yield on cost, upcoming dates |
| `GET` | `/analytics/tax-loss-harvesting` | Loss candidates with wash-sale flags |
| `GET` | `/analytics/monthly-returns` | Year × month return grid |
| `GET` | `/analytics/correlation` | Correlation matrix and diversification score |
| `GET` | `/analytics/goal` | Progress against your portfolio goal |
| `GET` | `/analytics/goal/config` | Read the goal |
| `POST` | `/analytics/goal/config` | Save the goal |
| `POST` | `/analytics/portfolio-insights` | AI portfolio review — **local Ollama only** |

## Rebalance

| Method | Path | Description |
|---|---|---|
| `GET` | `/rebalance/plan` | Drift, actions, trade values and share counts |
| `GET` | `/rebalance/targets` | Read target weights |
| `POST` | `/rebalance/targets` | Save target weights |

## Alerts

| Method | Path | Description |
|---|---|---|
| `GET` | `/alerts` | List alerts |
| `GET` | `/alerts/status` | Current trigger state, with live prices |
| `PUT` | `/alerts` | Create an alert |
| `POST` | `/alerts/:id` | Update an alert |
| `DELETE` | `/alerts/:id` | Delete an alert |

## Notifications

| Method | Path | Description |
|---|---|---|
| `GET` | `/notifications/history` | What the app has sent |
| `DELETE` | `/notifications/history` | Clear history |
| `POST` | `/notifications/history/prune` | Prune old entries |

## Notes

| Method | Path | Description |
|---|---|---|
| `GET` | `/notes/:symbol` | Your notes for a ticker |
| `POST` | `/notes/:symbol` | Save notes for a ticker |

## AI document import

| Method | Path | Description |
|---|---|---|
| `POST` | `/ai-import/parse` | Parse a statement into holdings or transactions. `target` must be `holdings` or `transactions`; text is capped at 200,000 characters. **Local Ollama only** — refuses to run against a hosted provider |

## Database

| Method | Path | Description |
|---|---|---|
| `GET` | `/database/:collection` | Raw documents in a collection |
| `DELETE` | `/database/:collection/:id` | Delete one document |
| `DELETE` | `/database/:collection` | Clear a collection |

## Logs

| Method | Path | Description |
|---|---|---|
| `GET` | `/logs/:file` | Read a log — `combined` or `error` only (allowlisted) |
| `DELETE` | `/logs/:file` | Clear a log |

## Settings

### Data

| Method | Path | Description |
|---|---|---|
| `GET` | `/settings/db/export` | Zip of every collection |
| `POST` | `/settings/db/import` | Restore from a zip (raw body). **Destructive per-collection replace** |
| `GET` | `/settings/backups` | List scheduled backup files |
| `GET` | `/settings/backups/:file` | Download one |
| `GET`/`POST` | `/settings/scheduled-backup` | Read / save schedule config |
| `POST` | `/settings/scheduled-backup/run` | Run a backup now |

### Demo mode & security

| Method | Path | Description |
|---|---|---|
| `GET`/`POST` | `/settings/demo-mode` | Read / toggle demo mode |
| `POST` | `/settings/demo-mode/reset` | Regenerate the sample dataset |
| `GET`/`POST` | `/settings/lock` | Read / save lock config. `GET` never requires auth |

### AI

| Method | Path | Description |
|---|---|---|
| `GET`/`POST` | `/settings/ai-config` | Provider, model and keys |

### Notification services

Each takes `GET` to read and `POST` to save; some add a `/test` action that
publishes a sample message.

| Path | Service |
|---|---|
| `/settings/notifications` (+ `/test`) | MQTT broker connection |
| `/settings/alerts-monitor` | Price alert monitor |
| `/settings/move-alert` | Move & spike alerts |
| `/settings/news-watch` (+ `/test`) | Breaking news alerts |
| `/settings/earnings-reminder` (+ `/test`) | Earnings alerts |
| `/settings/dividend-watch` (+ `/test`) | Dividend alerts |
| `/settings/ipo-reminder` | IPO reminders |
| `/settings/ipo-announcement` (+ `/test`) | New IPO announcements |
| `/settings/quiet-hours` (+ `/flush`) | Quiet hours; `flush` releases held messages |
| `/settings/trading-summary` (+ `/test`) | Daily trading summary |
| `/settings/value-calc` | Portfolio value snapshot tracker |

Defaults for all of them: [Background services](/reference/background-services).
