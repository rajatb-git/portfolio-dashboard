# Changelog

## 2.0.3

- Migrate from legacy `/etc/cont-init.d` and `/etc/services.d` to native
  s6-overlay v3 `/etc/s6-overlay/s6-rc.d` layout. Removes the
  `legacy-cont-init` / `legacy-services` wrappers, gives proper dependency
  ordering (backend and nginx wait for the `init` oneshot), and makes
  service stdout/stderr reach `docker logs` reliably.
- Send nginx access logs to `/dev/stdout` and error logs to `/dev/stderr`
  (including the master process via `nginx -e /dev/stderr`) so failures
  surface in the HA log viewer instead of disappearing into
  `/var/log/nginx/*.log`.
- Guard optional bashio config reads (`finnhub_api`, `finnhub_api_key`)
  with `bashio::config.has_value` so a null value doesn't abort the init
  script under `set -e`.

## 2.0.2

- Fix `/bin/sh: can't open '/init': Permission denied` on container start by
  granting read permission alongside execute (`rix`) in the AppArmor profile
  for `/init` and standard binary paths. The s6-overlay `/init` and several
  helpers (e.g. `bashio`, `with-contenv`, `execlineb`) are shell/execline
  scripts, so the interpreter must be able to read them.

## 1.0.30

- Initial Home Assistant add-on release.
- Single-container build: backend (Koa 3 + SkewerDB) and frontend (React +
  Vite) served behind nginx on port 8099 with HA Ingress.
- AppArmor profile enabled (deny-by-default for /proc/sys, /sys, /boot,
  modules, mount, ptrace).
- Multi-arch images for amd64, aarch64, armv7 published to GHCR.
- Configurable options: log level, Finnhub API base URL and key.
- Persistent storage at `/data/storage` (survives addon restarts and
  updates).
