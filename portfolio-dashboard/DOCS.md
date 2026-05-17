# Portfolio Dashboard - Documentation

## Install

In Home Assistant: Settings -> Add-ons -> Add-on Store -> menu ->
Repositories -> add

```
https://github.com/rajatb-git/portfolio-dashboard
```

Install "Portfolio Dashboard" from the resulting card.

## Options

- `log_level` (default: `info`) - one of `debug`, `info`, `warn`, `error`.
- `finnhub_api` - Finnhub REST base URL (typically
  `https://finnhub.io/api/v1`). Required for live quotes, news, IPO
  calendar, and analyst recommendations.
- `finnhub_api_key` - Finnhub API key. Stored as a password field; the
  addon injects it into the backend as the `FINN_HUB_API_KEY` env var.

AI provider credentials (Claude, Gemini, Ollama host) are configured
in-app on the **Settings** page after the addon starts - they are
persisted to SkewerDB so they survive addon restarts and updates.

## Storage

All data lives under `/data/storage` (SkewerDB JSON files). This volume
is managed by Home Assistant and persists across addon updates. Use the
**Settings -> Database** page in the UI to export a zipped backup or
restore one.

## Ingress

The addon exposes a single port (`8099`) behind HA Ingress. After
install, a "Portfolio" entry appears in the HA sidebar (icon: chart-line).
The panel is admin-only by default - tighten or relax via
`panel_admin` in the addon config if needed.

If you also want to expose the backend or frontend directly (advanced
use - e.g. for an external mobile client), set the optional `3000/tcp`
and `3001/tcp` host ports in the addon Configuration -> Network panel.

## Six-digit lock

The app ships with an optional six-digit lock you can enable under
**Settings -> Security**. This is independent of Home Assistant
authentication and runs inside the addon. When enabled, every
non-Ingress browser session (or session after the idle timeout) must
enter the code before any data is fetched. The hashed code lives in
SkewerDB at `/data/storage/lock_config.json`.

Behind HA Ingress the lock screen still appears - the addon does not
trust the Ingress headers as user identity.

## Updating

Updates ship via GHCR. The HA supervisor pulls a new image when a new
release tag is published. Your `/data/storage` volume is preserved.

## Backup and restore

In-app export (Settings -> Database -> Export) downloads a zip of the
entire storage directory. To restore on a fresh install, use the
matching Import button - it clears `/data/storage` and unpacks the zip
in place. Restart the addon afterwards so SkewerDB picks up the new
files.
