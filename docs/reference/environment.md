# Environment variables

Backend configuration lives in `packages/backend/.env` (copy it from
`.env.example`). Only `MONGO_URI` and the Finnhub key are required — everything
else has a sensible default.

::: warning `.env` is gitignored
Never commit real keys. AI provider keys are *not* configured here at all —
they live in the app's Settings, stored in MongoDB.
:::

## MongoDB

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGO_URI` | ✅ | — | Connection string for the MongoDB instance that stores holdings, accounts, transactions, config and market-data caches. The backend does not run without it |
| `MONGO_DB_NAME` | — | `portfolio_dashboard` | Logical database name. [Demo Mode](/features/demo-mode-and-lock) automatically uses `<this>_demo` on the same server |

MongoDB creates the database and its collections on first write — there is no
schema to provision.

::: danger Containers and `localhost`
If the backend runs in a container, `MONGO_URI` must be the Mongo host's LAN
address. `localhost` inside the container resolves to the container itself.
:::

## Finnhub

| Variable | Required | Default | Description |
|---|---|---|---|
| `FINN_HUB_API` | ✅ | — | API base URL — `https://finnhub.io/api/v1` |
| `FINN_HUB_API_KEY` | ✅ | — | Free key from [finnhub.io](https://finnhub.io) |
| `FINN_HUB_BURST_LIMIT` | — | `30` | Calls allowed in any rolling 1-second window |
| `FINN_HUB_RATE_LIMIT` | — | `60` | Calls allowed in any rolling 60-second window |

The free tier enforces **both** limits at once — a per-second burst allowance
and a sustained per-minute cap. The defaults match the free tier's actual
numbers; raise them only if you are on a paid plan. The sustained limit is the
one that bites when a dashboard refresh fans out across many holdings.

Finnhub powers quotes, recommendations, news, metrics, peers, earnings, insider
transactions, company profiles and the IPO calendar. **NASDAQ** supplies price
history and needs no key.

## Server

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | — | `3001` | Port the Koa backend listens on |
| `STORAGE_DIR` | — | `./storage` | Working-directory anchor for scheduled backup zips, logs and the demo-mode flag. Must end in `storage`. No application data lives here — that is all in MongoDB |

Scheduled backup zips are written to `STORAGE_DIR/../backups`.

## Frontend

The frontend has one build-time variable:

| Variable | Default | Description |
|---|---|---|
| `VITE_DB_HOST` | `http://localhost:3001` | Backend base URL, compiled into the bundle |

Resolution order at runtime: `localStorage.api_host` (set under **Settings →
Application → Backend URL**) → `VITE_DB_HOST` → `http://localhost:3001`.

In Docker the frontend image is built with `VITE_DB_HOST=/api` and nginx proxies
`/api/` to the backend service — see [Deploying with Docker](/guide/docker).

## What is *not* in env

| Setting | Where it lives |
|---|---|
| Claude / Gemini API keys, Ollama host and model | **Settings → AI Agent** → MongoDB |
| MQTT broker URL and credentials | **Settings → Alert Notifications** → MongoDB |
| Alert thresholds, intervals, quiet hours, backups | **Settings** → MongoDB |
| App passcode | **Settings → Security** → MongoDB (salted + hashed) |

This is deliberate: those settings are editable without a restart and travel
with your [backups](/guide/backups).
