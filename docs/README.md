# Portfolio Dashboard — Documentation

This folder contains design and engineering docs for the Portfolio Dashboard app. Intended for any human or AI working on the codebase.

For AI-specific working notes (conventions, gotchas, commands), see `CLAUDE.md` at the repo root.

## Contents

- **[architecture.md](./architecture.md)** — system architecture, packages, data flow, external dependencies.
- **[design-system.md](./design-system.md)** — colors, typography, spacing, icons, brand marks.
- **[ui-conventions.md](./ui-conventions.md)** — interaction patterns: forms, save buttons, loading, empty states, toasts.
- **[error-handling.md](./error-handling.md)** — the canonical error-handling contract between frontend and backend.

## Quick orientation

```
┌────────────────────────────┐       ┌────────────────────────────┐
│   React 19 + MUI 7 (Vite)  │──────▶│   Koa 3 + TypeScript       │
│   packages/frontend        │ HTTP  │   packages/backend         │
└────────────────────────────┘       └─────┬──────────────────────┘
                                           │
                        ┌──────────────────┼───────────────────┐
                        ▼                  ▼                   ▼
                 MongoDB            Finnhub / NASDAQ     Claude / Gemini /
                 (MONGO_URI)        (market data)        Ollama (AI)
```

Single-user, self-hosted. Data lives in MongoDB (`MONGO_URI`/`MONGO_DB_NAME` in `.env`) and can be exported/restored as a zip via Settings → Data.
