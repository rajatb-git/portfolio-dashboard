# Configuration

Portfolio Dashboard is configured in two places, and the split is deliberate:

| Where | What lives there | Why |
|---|---|---|
| `packages/backend/.env` | Infrastructure: MongoDB, Finnhub, port, storage path | Needed before the server can start |
| **Settings** in the app | Everything else: AI providers, alerts, notifications, backups, lock, appearance | Stored in MongoDB, editable without a restart, included in backups |

## Backend environment

Copy the template and edit it:

```sh
cp packages/backend/.env.example packages/backend/.env
```

Only two values are required:

```ini
# Where all your data lives
MONGO_URI=mongodb://user:password@your-mongo-host:27017

# Public market data — free key from https://finnhub.io
FINN_HUB_API_KEY=your_finnhub_api_key_here
```

Everything else is optional and documented in the
[environment variable reference](/reference/environment).

::: warning Running the backend in a container?
`MONGO_URI` must be the Mongo host's **LAN address**. Inside a container,
`localhost` resolves to the container itself, not your Mongo host.
:::

`.env` is gitignored. Never commit real keys.

## Pointing the frontend at the backend

The frontend resolves the API base URL in this order:

1. The `api_host` value in `localStorage`, set under **Settings → Application →
   Backend URL** — takes precedence, and survives rebuilds.
2. The `VITE_DB_HOST` build-time variable.
3. `http://localhost:3001`.

For a Docker deployment, `VITE_DB_HOST` is baked in at image build time (the
compose file passes `/api`). See [Deploying with Docker](/guide/docker).

## In-app settings

Open **Settings** from the sidebar. Every section follows the same pattern:
edit the fields, then press **Save** — nothing auto-saves, and an *Unsaved
changes* marker appears while a section is dirty.

### Application & Appearance

Backend URL, light/dark theme, interface density, default rows per page and
chart preferences.

### AI Agent

Enable AI features and pick a provider:

| Provider | Where it runs | Model default |
|---|---|---|
| **Ollama (Local)** | Your machine — nothing leaves it | `llama3.1` |
| **Claude** | Anthropic API | `claude-sonnet-4-6` |
| **Gemini** | Google API | `gemini-2.0-flash` |

Keys are stored in MongoDB, never in `.env`. Which features work with which
provider is governed by the
[AI data-privacy rule](/internals/ai-privacy) — in short, anything touching
your positions requires Ollama.

### Alert Notifications (MQTT)

Broker URL, credentials, default topic, QoS and retain flag. This is the
transport every notification service publishes through — see
[Alerts & notifications](/features/alerts). Browser price alerts can be enabled
separately and do not need a broker.

### Notification services

Each of these is an independently scheduled background job with its own enable
switch, cadence and MQTT topic:

- **Price Alert Monitor** — evaluates your saved price alerts
- **Move Alerts** — threshold, escalation and short-window spike detection,
  with crypto-24/7 and after-hours options
- **Breaking News Alerts** — headlines for your holdings and the broad market
- **Earnings Alerts** — reminders before a report, plus results afterwards
- **Dividend Alerts** — ex-dividend and payment date reminders
- **IPO Reminders** and **IPO Announcements**
- **Daily Trading Summary** — morning, midday and close portfolio recaps
- **Portfolio Value Tracker** — periodically snapshots total value for the
  performance chart
- **Quiet Hours** — suppress or digest notifications overnight, with an
  optional "let big moves through" threshold

Defaults for every one of them are listed in
[Background services](/reference/background-services).

### Data

Export the whole database as a zip, import one back, configure
[scheduled backups](/guide/backups) (interval and how many to keep), and toggle
[Demo Mode](/features/demo-mode-and-lock).

### Security

An optional passcode lock with a configurable auto-lock timeout. When enabled,
the API requires a signed session token — details in
[Demo mode & app lock](/features/demo-mode-and-lock).

### Accounts

Create, rename and delete brokerage accounts, and adjust cash balances.

## Where settings are stored

Every in-app setting is a document in MongoDB (`ai_config`,
`notification_config`, `move_alert_config`, `quiet_hours_config`, …). That means
they travel with your [backups](/guide/backups) and survive container
rebuilds — but also that a database restore replaces them.
