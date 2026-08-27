# Commands

All commands run from the repo root unless noted. The repo is a pnpm workspace,
so a single `pnpm install` bootstraps the frontend, the backend and this
documentation site.

## Development

| Command | What it does |
|---|---|
| `pnpm install` | Install every workspace's dependencies |
| `pnpm dev` | Run frontend and backend together |
| `pnpm dev:frontend` | Vite dev server on `http://localhost:5173` |
| `pnpm dev:backend` | Koa with nodemon on `http://localhost:3001` |

## Build

| Command | What it does |
|---|---|
| `pnpm -r build` | Build every package |
| `pnpm build:frontend` | Type-check and bundle the SPA |
| `pnpm build:backend` | Compile the API with `tsc` |
| `pnpm clean` | Remove build output |

Run `pnpm -r build` before committing — TypeScript errors that CI would catch
show up here first.

## Quality

| Command | What it does |
|---|---|
| `pnpm lint` | Biome lint across all packages |
| `pnpm format` | Biome format check |
| `pnpm knip` | Find unused files, exports and dependencies |

Per-package variants exist too: `pnpm --filter @portfolio/frontend lint:fix`
and `format:fix` write changes rather than only reporting them.

## Documentation site

| Command | What it does |
|---|---|
| `pnpm docs:dev` | Serve this site locally with hot reload |
| `pnpm docs:build` | Build the static site into `docs/.vitepress/dist` |
| `pnpm docs:preview` | Preview the built output |

The site is published to GitHub Pages automatically — see
[Contributing](/internals/contributing#documentation).

## Backend utilities

| Command | What it does |
|---|---|
| `pnpm --filter @portfolio/backend start` | Run the compiled server from `dist/` |
| `pnpm --filter @portfolio/backend migrate:mongo` | Migrate a pre-MongoDB `storage/` directory into MongoDB. Only populates collections still empty, unless run with `--force` |

## Docker

| Command | What it does |
|---|---|
| `docker compose up -d` | Build and start both containers |
| `docker compose logs -f backend` | Follow backend logs |
| `docker compose build --pull` | Rebuild after pulling changes |
| `docker compose down` | Stop everything (named volumes survive) |

See [Deploying with Docker](/guide/docker) for the environment variables the
compose file expects.
