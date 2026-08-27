# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.5.1] – 2026-08-27

### Fixed
- **Wrong next-earnings date** — The next report for a ticker was read as the first entry Finnhub happened to return rather than the nearest one by date, so a symbol with several scheduled releases showed a quarter further out (NVDA reading November instead of its August report). The nearest upcoming release is now picked by date.
- **Silent earnings reminders** — The holdings earnings calendar is fetched in one unfiltered request, which not every Finnhub plan serves. When that request failed the app quietly kept serving the last cached calendar indefinitely, so both the dashboard and the earnings alerts stayed pinned to a quarter that had already reported and no reminder ever fired. The calendar now falls back to per-symbol lookups, treats an empty bulk result as a failure, and stops trusting a cached calendar it has been unable to refresh for a day.
- The earnings calendar now counts days against the market's date in ET rather than the server's local date, so a report due that afternoon is not dropped by a UTC host rolling over at 20:00 ET, and "Today"/"Tomorrow" mean what they say. The countdown is recomputed on every read instead of being stored with the cached calendar.

---

## [4.5.0] – 2026-08-26

### Added
- **Pre-market and after-hours movement** — The Today page now shows a dedicated extended-hours card while pre-market (4:00 AM ET) or after-hours (to 8:00 PM ET) trading is running: index moves, which of your holdings are trading, and what the move is worth against the last close. Quotes now keep the regular-session close and the extended-hours print as separate figures instead of overwriting one with the other, so "Tuesday's close" and "up 0.4% pre-market" can both be true at once.
- **Session-aware Today banner** — Replaces the flat "markets are closed" notice with what is actually happening: which session is running, which session the figures below reflect, and a live countdown to the opening bell (or to the close). The market-status chip carries the same countdown.
- **News for your holdings** — The market news card gains a second tab showing company news for the tickers you hold, plus any broad-market headline that names one of your positions. Stories are tagged with the ticker and flagged when they carry market-moving language.
- **News category filters** — Top market news can be narrowed to markets, stocks, business, economy, tech or crypto, each backed by its own feeds.

### Changed
- News is aggregated from more publishers (added WSJ Markets and Tech, MarketWatch Top Stories and Market Pulse, Nasdaq Stocks, Investing.com, Seeking Alpha and Cointelegraph), so one outlet going down degrades the digest rather than emptying it. Headlines are deduped across outlets by significant words rather than an exact string match, HTML and numeric entities are decoded, summaries are clamped, and each feed is capped so a prolific publisher can't crowd out the rest.
- The market calendar now models pre-market and after-hours directly, including early-close half days, and quote polling is driven by it — so no more background fetches on holidays.
- Market status falls back to the local exchange calendar when Finnhub is unreachable or returns no session, instead of failing outright.
- Market-moving keyword matching now catches inflected forms ("surging", "rallies", "tumbled"), and ticker matching ignores symbols that are also common English words.

---

## [4.4.0] – 2026-08-25

### Added
- **Quiet hours** — Hold back alerts overnight on an ET window that may wrap midnight. Digest mode parks everything that lands in the window and sends a single summary when it ends; suppress mode drops it. A configurable "wake me" threshold lets a big enough move through anyway. Scheduled trading summaries and test sends always go through, and a "Send held now" button drains the queue on demand.
- **Notification history** — Every notification the app sends is now recorded and browsable on a new Notifications page, with the source, symbol, message, and whether it was delivered, failed, or held by quiet hours. Kept for 30 days, filterable by source, so thresholds can be tuned against what actually fired.
- **Earnings alerts** — A heads-up a configurable number of days before any holding reports, including the pre-market/after-close slot and consensus EPS, then a follow-up once the actual number lands showing the beat or miss against estimate.
- **Dividend tracking** — New Income tab on Analytics showing projected annual income, average per month, portfolio yield on cost, upcoming ex-dividend and payment dates, and a per-holding breakdown with yield on cost against what each position actually cost. Backed by a new public NASDAQ dividends source.
- **Dividend alerts** — Notify ahead of an ex-dividend date or a payment, with the amount to expect based on your share count.
- **Richer alert conditions** — Alerts are no longer limited to a fixed price target. Added trailing stop (a drop from the highest price seen since the alert was created, with the peak tracked by the monitor), percent below the 52-week high, and a cost-basis cross. The monitor and the Alerts page now share one evaluator, so the page can never disagree with what actually fires.
- **Portfolio brief on Today** — The Today page now leads with what changed while you were away: currently triggered alerts, what was sent in the last 24 hours, holdings reporting this week, and dividends due in the next two weeks.

### Changed
- Every notification now passes through a single delivery chokepoint that applies quiet hours and records history, instead of each service publishing to MQTT independently. Trading summaries route through it too, so they appear in the history.

---

## [4.3.0] – 2026-08-25

### Added
- **Breaking news alerts** — A background news watcher polls company news for every stock ticker you hold plus the broad market wire, and pushes new headlines over MQTT as they land. Runs around the clock rather than on the market calendar, since news breaks overnight and at weekends. Headlines are scored against market-moving patterns (trading halts, guidance, up/downgrades, M&A, lawsuits, regulatory probes, big price moves); "Breaking only" mode publishes just those, and stories about a holding rank above generic coverage. Configurable poll interval, per-run notification cap, lookback window, and topic, with a "Send now" test. Only public headline data is published — no holdings, quantities, or P&L.
- **Move alert escalation** — Move alerts now re-fire as a move grows instead of going quiet after the first notification. With a 5% threshold and a 3% step, a position sliding to −5%, −8% and −11% reports each leg. Escalation is tracked per direction, so a symbol that reverses intraday is reported both ways. Setting the step to 0 keeps the previous once-per-day behaviour.
- **Intraday spike alerts** — Move alerts can now flag a holding that runs a configurable percentage inside a rolling window (default 2% in 30 minutes), catching sharp moves that a day-change threshold misses when a symbol round-trips and ends flat.
- **24/7 move coverage** — Crypto holdings can be evaluated around the clock instead of only during US equity hours, and stock coverage can extend past the close so a move that landed at the bell still reaches you if the server was down at the time.

### Fixed
- Move alert bookkeeping now rolls on the ET trading day rather than the UTC day. The UTC rollover lands at 8pm ET, which would have re-announced the same day's move during after-hours checks.

---

## [4.2.0] – 2026-08-13

### Added
- **Changelog page** — New `/changelog` page (Manage section) renders this file's release history in-app, with version headings and color-coded Added/Changed/Fixed/Removed/Security sections.

---

## [3.0.0] – 2026-06-21

### Removed
- **Watchlist** — Removed the watchlist feature (Dashboard section, Research page star toggle, and the `/watchlist` backend routes/model). The standalone price alerts feature covers tracking symbols of interest.
- **Holding price targets** — Removed the `targetPrice` field from holdings, the Buy/Sell dialog input, the Database column, the "near target" row chips, and the target-based Price Alerts dashboard card. The standalone alerts feature (with its own per-symbol target price and direction) supersedes it.

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
