# Portfolio Dashboard

Self-hosted dashboard for tracking stock and crypto holdings across multiple
accounts. Live quotes from Finnhub and NASDAQ, optional AI equity analysis
(Claude / Gemini / Ollama), portfolio analytics, watchlist, IPO calendar, and
import/export backups.

See [`docs/`](docs/) for architecture, design system, UI conventions, and
error-handling guides. AI working notes live in `CLAUDE.md`.

## Run with Docker Compose

```sh
docker compose up -d
```

Frontend on `http://localhost:3000`, backend API on `http://localhost:3001`.
Storage persists to a named Docker volume.

## Install as Home Assistant Add-on

1. Open Home Assistant -> Settings -> Add-ons -> Add-on Store.
2. Click the menu (top-right) -> Repositories.
3. Add `https://github.com/rajatb-git/portfolio-dashboard` and close.
4. Find **Portfolio Dashboard** in the store and install.
5. Open the Configuration tab, fill in your Finnhub API URL and key
   (the AI provider keys are configured later from the app's Settings
   page), then Start the addon.
6. A **Portfolio** entry appears in the Home Assistant sidebar (Ingress).
   No port forwarding required.

Multi-arch images (amd64, aarch64, armv7) are published to GHCR. Persistent
data lives at `/data/storage` inside the addon and survives restarts and
updates. Full options reference is in
[`portfolio-dashboard/DOCS.md`](portfolio-dashboard/DOCS.md).

## Develop locally

Requires Node >=22 and pnpm.

```sh
pnpm install
pnpm dev          # both packages in parallel
pnpm -r build
pnpm lint
```
