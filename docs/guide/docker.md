# Deploying with Docker

The repo ships a two-service `docker-compose.yml` — an nginx-served frontend and
the Koa backend. MongoDB is **not** part of the compose file: the app expects
you to point it at a Mongo instance you already run.

## Quick start

```sh
git clone https://github.com/rajatb-git/portfolio-dashboard.git
cd portfolio-dashboard

# The compose file passes these through from your shell / .env file
export MONGO_URI="mongodb://user:password@192.168.1.10:27017"
export MONGO_DB_NAME="portfolio_dashboard"
export FINN_HUB_API="https://finnhub.io/api/v1"
export FINN_HUB_API_KEY="your_finnhub_api_key_here"

docker compose up -d
```

| Service | URL | Notes |
|---|---|---|
| Frontend | `http://localhost:3000` | nginx, SPA fallback, proxies `/api/` to the backend |
| Backend | `http://localhost:3001` | Koa API |

::: danger MONGO_URI must not be localhost
Inside the backend container, `localhost` is the *container*. Use the LAN
address or hostname of your Mongo host — e.g.
`mongodb://user:pass@192.168.1.10:27017`.
:::

## How the two containers talk

The frontend image is built with `VITE_DB_HOST=/api`, and nginx proxies
`/api/` to `http://backend:3001/` over the compose network. That means the
browser only ever talks to one origin, and you do not need to expose the
backend port publicly — you can drop the `3001:3001` mapping if you only use
the app through the frontend.

nginx also raises the proxy timeouts to 180s, so slow AI generation (a local
Ollama loading a model on the first request) surfaces the backend's own error
rather than an opaque 504.

## Using the published images

Release builds are pushed to GHCR for `linux/amd64` and `linux/arm64`. Swap the
`build:` blocks in `docker-compose.yml` for the commented-out `image:` lines:

```yaml
services:
  backend:
    image: ghcr.io/rajatb-git/portfolio-dashboard/backend:${TAG:-latest}
  frontend:
    image: ghcr.io/rajatb-git/portfolio-dashboard/frontend:${TAG:-latest}
```

Then pin a version and pull:

```sh
TAG=4.5.0 docker compose pull && TAG=4.5.0 docker compose up -d
```

Images are tagged with the full version, `major.minor`, `major`, the commit SHA
and `latest`.

::: tip Building the frontend image yourself
`VITE_DB_HOST` is a **build argument**, not a runtime variable — it is compiled
into the bundle. If you serve the API from somewhere other than `/api`, rebuild
with `--build-arg VITE_DB_HOST=https://api.example.com`, or just override the
backend URL in-app under **Settings → Application**.
:::

## Volumes and state

```yaml
volumes:
  backend-storage:   # mounted at /app/storage in the backend container
```

Application data lives in **MongoDB**, not in this volume. What the volume holds
is the backend's working directory: scheduled backup zips, log files and the
demo-mode flag. Keep it if you rely on
[scheduled backups](/guide/backups) — you will want those zips to survive a
container rebuild.

## Environment variables

The compose file passes these through to the backend:

| Variable | Required | Notes |
|---|---|---|
| `MONGO_URI` | ✅ | LAN address of your Mongo host |
| `MONGO_DB_NAME` | — | Defaults to `portfolio_dashboard` |
| `FINN_HUB_API` | ✅ | `https://finnhub.io/api/v1` |
| `FINN_HUB_API_KEY` | ✅ | Free tier is fine |
| `FINN_HUB_BURST_LIMIT` | — | Defaults to 30 calls/second |
| `FINN_HUB_RATE_LIMIT` | — | Defaults to 60 calls/minute |

Docker Compose reads a `.env` file sitting next to `docker-compose.yml`, so you
can put them there instead of exporting them.

Full descriptions: [environment variable reference](/reference/environment).

## Health check

```sh
curl http://localhost:3001/health
```

The backend logs to the mounted storage volume and to stdout, so
`docker compose logs -f backend` is the fastest way to diagnose a bad Mongo URI
or a rejected Finnhub key.

## Updating

```sh
git pull
docker compose build --pull
docker compose up -d
```

Or, with published images, bump `TAG` and re-run `docker compose pull && docker compose up -d`.
Take a [backup](/guide/backups) first — it takes one click.
