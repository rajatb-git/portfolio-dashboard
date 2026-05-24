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

## Develop locally

Requires Node >=22 and pnpm.

```sh
pnpm install
pnpm dev          # both packages in parallel
pnpm -r build
pnpm lint
```
