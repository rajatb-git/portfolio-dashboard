# Changelog

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
