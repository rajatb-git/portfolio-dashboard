# Getting started

This page takes you from a clone to a running dashboard. If you would rather
run containers than install Node, skip to
[Deploying with Docker](/guide/docker).

## Prerequisites

| Requirement | Notes |
|---|---|
| **Node ≥ 22** | The repo pins its own pnpm version via `packageManager` |
| **pnpm** | `corepack enable` is enough — pnpm will match the pinned version |
| **MongoDB** | Any reachable instance: local, LAN, Docker or Atlas. The backend will not start without it |
| **Finnhub API key** | Free tier is fine — [finnhub.io](https://finnhub.io/) |

::: tip You do not need to create the database
MongoDB creates the database and its collections on first write. Point
`MONGO_URI` at the server and `MONGO_DB_NAME` at whatever name you like.
:::

## 1. Clone and install

```sh
git clone https://github.com/rajatb-git/portfolio-dashboard.git
cd portfolio-dashboard
pnpm install
```

A single install at the root bootstraps both packages — the frontend, the
backend and this docs site are all workspaces of one pnpm monorepo.

## 2. Configure the backend

```sh
cp packages/backend/.env.example packages/backend/.env
```

Open `packages/backend/.env` and fill in the two required values:

```ini
MONGO_URI=mongodb://user:password@your-mongo-host:27017
FINN_HUB_API_KEY=your_finnhub_api_key_here
```

Everything else has a working default. The full list — including the Finnhub
rate-limit knobs and the storage directory — is in the
[environment variable reference](/reference/environment).

::: warning API keys for AI are *not* set here
Claude / Gemini keys and the Ollama host are configured in-app under
**Settings → AI Agent** and stored in MongoDB. Nothing secret is read from
`.env` for AI.
:::

## 3. Run it

```sh
pnpm dev
```

| Service | URL |
|---|---|
| Frontend (Vite) | `http://localhost:5173` |
| Backend (Koa) | `http://localhost:3001` |

To run just one side: `pnpm dev:frontend` or `pnpm dev:backend`.

The frontend finds the API through `VITE_DB_HOST` (defaulting to
`http://localhost:3001`). You can also override it at runtime under
**Settings → Application → Backend URL**, which is stored in `localStorage`
under `api_host` — handy when the API lives on another host on your LAN.

## 4. First-run checklist

Once the app is open:

1. **Take a look around with sample data first (optional).** Turn on
   **Settings → Demo Mode**. It seeds a generated portfolio into a *separate*
   database (`<MONGO_DB_NAME>_demo`), so you can click through every screen
   before entering anything real. Turn it off when you are done —
   [more on Demo Mode](/features/demo-mode-and-lock).
2. **Create an account.** Go to **Database → Accounts** and add a brokerage
   account (name plus an optional starting cash balance). Holdings and
   transactions hang off accounts, so this comes first.
3. **Add your holdings.** Either enter them by hand under **Database →
   Holdings**, or import them — see
   [Importing your portfolio](/guide/importing-data).
4. **Check the dashboard.** Live prices, day change and gain/loss should
   populate for every symbol. If prices are missing, see
   [Troubleshooting](/guide/troubleshooting).
5. **Optionally enable AI.** Under **Settings → AI Agent**, pick a provider and
   enable insights. Read [Research & AI insights](/features/research) for what
   each provider is allowed to see.
6. **Optionally wire up notifications.** Under **Settings → Alert
   Notifications**, point the app at an MQTT broker to receive price, move,
   news, earnings and dividend alerts —
   [Alerts & notifications](/features/alerts).

## Common commands

| Task | Command |
|---|---|
| Dev (both packages) | `pnpm dev` |
| Dev (one package) | `pnpm dev:frontend` / `pnpm dev:backend` |
| Build everything | `pnpm -r build` |
| Lint | `pnpm lint` |
| Format | `pnpm format` |
| Docs site (this site) | `pnpm docs:dev` |

The full list, including the MongoDB migration script, is in the
[commands reference](/reference/commands).

## Next steps

- [Configuration](/guide/configuration) — every setting, in `.env` and in-app
- [Importing your portfolio](/guide/importing-data) — CSV, broker exports and
  AI-assisted statement parsing
- [Backups & restore](/guide/backups) — export, import and scheduled backups
