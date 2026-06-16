# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] – 2026-06-16

### Added
- **Price & target price alerts** — Dashboard card surfaces holdings that have reached or are near their target price. Status chips: At Target (green), Near Target (amber, within configurable threshold), Below (grey). Only shown when at least one holding has a target price set.
- **News sentiment aggregation** — Analytics page shows a per-symbol sentiment score derived from 7-day Finnhub news headlines, normalised to a −1 to +1 scale with an overall portfolio sentiment indicator.
- **Performance attribution** — Analytics page shows each holding's contribution to total return (All-Time view) and daily G/L (Today view), with inline horizontal bar charts and a portfolio-level summary row.
- **Broker CSV import presets** — The Database page transaction import now offers column-mapping presets for Robinhood, Charles Schwab, Fidelity, Coinbase, and Generic CSV formats, with a 5-row live preview before committing the import.
- **Cash row support in holdings import** — Holdings CSV import now correctly handles cash rows.
- **Automatic cash reconciliation** — Account cash balance is automatically updated when a transaction is edited or deleted.
- **Alert threshold setting** — Settings page exposes a configurable numeric threshold (1–50 %) for the "near target" alert band, persisted to localStorage.

### Removed
- **Portfolio-level AI analysis** — Removed because it sent personal financial data (portfolio dollar value, position sizes, gain/loss amounts) to external AI providers without explicit user consent.
- **AI chat assistant** — Removed for the same reason; the chat context included live holding quantities, prices, account IDs, and P/L sent to whichever external AI API was configured.

### Security
- Added a hard data-privacy rule to `CLAUDE.md` prohibiting any feature from sending personal holdings, quantities, cost basis, or P&L to an external AI provider. The only permitted AI feature is the per-ticker `AgentInsights`, which uses only publicly available market data (company profile, analyst ratings, earnings, news headlines).

---

## [2.0.4] – 2026-06-10

### Added
- Transaction CSV import from the Database page (generic column mapping).

### Fixed
- Dashboard total value race condition when holdings and prices resolved at different times.
- Account cards now correctly scoped per account.

---

## [2.0.3] – 2026-06-08

### Changed
- Deep dependency clean: all frontend and backend packages bumped to latest stable versions.
- Removed unused code identified by Knip.

---

## [2.0.2] – 2026-06-06

### Fixed
- Home Assistant addon: migrated to native s6-overlay v3 layout for reliable log ordering.
- Home Assistant addon: granted read permission on `/init` and binary paths in AppArmor profile.

---

## [2.0.1] – 2026-06-05

### Fixed
- Home Assistant addon build: builds on host architecture via `BUILDPLATFORM`, ships artifacts to target arch.
- Auto-sync addon and package versions to release tag on publish.

---

## [2.0.0] – 2026-06-01

### Added
- **Lock screen & security** — Six-digit PIN lock with HMAC bearer tokens and configurable idle timeout.
- **Home Assistant addon** — Single-container HA addon with ingress support, AppArmor profile, and automated GHCR image builds for amd64 / aarch64 / armv7.
- **Realized P/L** — Sell transactions now record and display realised profit/loss at write time.
- **Account cash balances** — Deposit and withdraw transactions update a per-account cash balance, surfaced on the Dashboard.
- **Research position details** — Research page shows a Position Details section for any held symbol.
- **PWA support** — Service worker, web manifest, and install prompt for desktop/mobile installation.
- **NASDAQ fallback** — Live quote falls back to NASDAQ price history when Finnhub returns no quote.
- **"% of Account" column** — Dashboard holdings table shows each position's weight within its account.
- **Docker & HTTPS** — Docker Compose setup with Nginx reverse proxy and optional HTTPS/Let's Encrypt support.
- **GHCR release workflow** — GitHub Actions publishes Docker images to GitHub Container Registry on release.

### Changed
- Backend storage directory is now configurable via `STORAGE_DIR` environment variable.
- Single shared axios instance across the frontend.

### Fixed
- Corrupt JSON storage recovery with atomic writes.
- Mobile-responsive layout and mobile navigation drawer.
- Research page prices now refresh correctly outside market hours.
