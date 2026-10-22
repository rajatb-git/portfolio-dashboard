# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.11.0] – 2026-10-22

### Added
- **Market data store** — every kind of Finnhub data now lives in one store (`market_data` collection) with its own freshness rules, kept warm by a scheduler that ranks what to refresh next: quotes for holdings and alerts first, then whatever page you have open. Pages read from the store instead of waiting on Finnhub, so Research for a held symbol opens from stored data and a symbol you don't hold fills in card by card.
- **Finnhub budget** — one client spends the free plan's 60 calls a minute, with a reserved share for what you're looking at, deadlines instead of queues that grow without limit, and the server's own rate-limit headers as the source of truth. `GET /health/market-data` shows the budget, the backlog and how fresh the store is.
- **Account tax types** — each account is taxable, tax-deferred or tax-free (edit under Settings → Accounts). Tax estimates, holding-period savings, loss harvesting and the trade simulator leave non-taxable accounts out.
- **Rebalance** — Reset and Clear targets buttons, and a summary of total buys, sells and net cash.
- **Logs** — filter by level and by text.
- **Alerts** — the table shows what each alert is measured from (peak, 52-week high or cost basis) and how far the price has to move to trigger it.

### Changed
- **Analytics returns are time-weighted.** Each day's buys and sells are netted out before the day's change is measured, so buying shares no longer counts as a gain. The performance chart now compares % returns from the start of the range against the benchmark, and the monthly grid and risk metrics use the same daily returns. Demo Mode history values holdings the same way the live tracker does.
- Rebalance targets can only be saved when they add up to 100%, and saving replaces the whole set.
- Deleting a buy or sell now undoes its effect on the holding's lots (or explains why it can't), and only a trade's date can be edited in place. Deleting an account deletes its holdings and transactions too. Grid deletes ask for confirmation.
- Sells can only relieve lots bought on or before the sale date; trades need a positive price; a buy or withdrawal that would overdraw a funded account asks first.
- Notifications that fire with no channel configured are recorded in the history as "Not sent — no channel", and the page says nothing is being delivered. Watching an IPO tells you whether its reminder will reach you.
- Trailing-stop alerts start their peak at the price on creation; cost-basis alerts need a position in the symbol.
- Settings → Backend URL now takes effect: it is checked against the backend's health endpoint, saved, and the page reloads. **Use default** removes the override. The selected Settings tab is kept in the URL.
- Search ranks your holdings and prefix matches first, and pages above ticker lookups.
- Sector allocation groups ETFs as funds and shows crypto as its own slice; the correlation card names the positions it leaves out; the income view says ETF distributions aren't covered.
- Every page sets its own browser tab title. Secondary text meets WCAG AA contrast in both themes, and small icon buttons have larger tap targets.

### Fixed
- Day high and low were swapped for prices from NASDAQ, and after-hours times were read as UTC.
- Research showed "No data found" for held ETFs and crypto, priced a held crypto from its namesake ETF, and showed "$0.00 +undefined%" while a price loaded.
- The 1-day and 5-day price charts were a session behind; the chart now sits under the header and shows a loading state.
- Insider transactions showed shares held after the trade instead of the trade size, never showed a value, and labelled gifts as sells. Transaction history sorted by when a trade was entered instead of its trade date.
- The Dashboard account filter ignored clicks on the account name; filtering no longer changes the summary cards, and the headline value no longer gets cut off on laptop widths.
- Dividends for stocks used a stale annual rate and a past ex-date.
- Duplicate EPS periods and peers caused React key warnings.
- The changelog page stopped at 4.4.0.

---

## [4.10.0] – 2026-10-21

### Added
- **Tax lots** — holdings now store one lot per purchase (quantity, cost and purchase date). Existing positions are rebuilt from the trade log automatically; positions imported without history show as one *Estimated* lot until you set the real dates.
- **Research → Position Details & Tax Lots** — expand any account to see each lot's cost, gain, and short/long-term status with days until it goes long-term; per-position short- vs long-term gains, estimated tax if sold, and the next lot to turn long-term. Lots are editable (pencil) with the usual Save / Reset flow.
- **Mock trade** — simulate a buy or sell (from Research or the Dashboard toolbar) without saving anything: realized short/long-term gain, estimated tax on top of this year's realized gains, net proceeds, a side-by-side comparison of FIFO / LIFO / highest-cost / tax-optimized / specific-lot selection, wash-sale detection, "wait until long-term" savings, and the position, cash and portfolio-weight before and after. Sale dates can be in the future.
- **Trade dialog** — sells pick a lot method (FIFO default) and show a live tax preview before you submit.
- **Analytics → Realized & Tax** — new *Tax Exposure* card (unrealized short/long-term gains, tax if everything were sold today, YTD realized tax, lots turning long-term in the next 90 days) and *Tax Rates* card for the short-term, long-term and state rates every estimate uses.
- **Holdings import** — an optional `purchaseDate` column (or a broker's *Date Acquired*) makes each row a lot; rows for the same account and symbol merge into one position.

### Changed
- Sells relieve specific lots, so the remaining average cost and the recorded P&L follow the lots actually sold instead of the running average. The lots relieved are stored on the sell transaction and Realized Gains uses them.
- Tax-loss harvesting works per lot: a position that is up overall still lists its losing lots, with short/long-term loss split and wash-sale checks across every account.
- Long-term now follows the IRS rule (held more than one year, i.e. from the day after the anniversary).
- Demo Mode seeds lots, including a long-term lot and one that turns long-term shortly.

---

## [4.9.2] – 2026-09-25

### Changed
- **Dependencies updated to latest** — every package across the workspace, replacing the open Dependabot PRs. Majors: ApexCharts 6 → 7, dotenv 17 → 18, and `@anthropic-ai/sdk` 0.124 → 0.128. Minor and patch: React 19.3, Vite 8.3, MUI X 9.14, `@google/genai` 2.24, axios 1.20, mongodb 7.6, mqtt 5.16, moment 2.31, react-router 7.18.4, react-dropzone 20.1.2, Biome 2.5.14 and knip 6.38.
- FullCalendar stays on 6.1.21: v7 of `@fullcalendar/core`/`react` is out, but its `daygrid`, `list` and `interaction` plugins are still release candidates.

### Fixed
- **Docs site build** — the workspace's `vite >= 8` override hands VitePress 1.x a Vite it wasn't built for, so `pnpm docs:build` failed with a missing `vue` and a missing `esbuild`. Both are now direct dev dependencies of the docs package.

---

## [4.9.1] – 2026-09-25

Fixes from a hands-on QA pass of the running app.

### Fixed
- **Cash dialog wiped the form every 30s** — the dashboard poll handed the dialog a fresh accounts array, which re-ran its reset. It now resets only when it opens.
- **Trades accepted negative, zero and junk quantities** — a sell of `-5` added shares, and `10abc` was saved as 10. The Trade dialog and both `/holdings/buy` and `/holdings/sell` now require a positive quantity and a non-negative price.
- **Fractional positions could not be fully sold** — float residue (0.1 + 0.2) left dust holdings and blocked selling the last of a crypto position. Quantities are rounded to 8 decimals.
- **A failed buy still saved the holding** — the account is now checked before anything is written.
- **Lowercase tickers became separate positions** — trade symbols are trimmed and uppercased.
- **Accounts with `/`, `#` or `?` in the name could not be deleted or funded** — account ids are now slugged server-side and account URLs are encoded. Duplicate names return a 400 with a readable message, and names are capped at 50 characters.
- **Database grid** — the toolbar with Add record and refresh never rendered, and new rows would have been upserted under the id `temp`. New rows now go through the create routes, edits show a success toast, and Action/Type are dropdowns. Holding and transaction create calls sent `{ data: … }` instead of the record.
- **`POST /transactions`, `/holdings` and `/accounts` without an id** saved a record with id `null`, which crashed the transactions grid. They now return 400, and transaction `action`/`type` are validated.
- **Clearing an alert's note did not stick** — alert edits now replace the record, so removed fields and stale trailing-stop state go away.
- **New accounts took up to 30s to appear on the Dashboard** — the Dashboard revalidates when you return to it.
- **Holdings with no live price vanished from the Dashboard** — they are now listed at cost basis with a notice naming the unpriced symbols.
- **Price Alert Threshold could not be typed into** — it clamped on every keystroke. It now validates on Save, and it and Backend URL have Reset and Unsaved-changes indicators.
- Missing accounts/transactions return 404 instead of an empty 200; schema errors name the field rather than the value; the Research price chart and the Database import buttons toast on failure instead of throwing.
- **Rebalance lost or mixed up targets** — lowercase holdings never matched their (upper-cased) saved target, and saving wiped targets for any holding missing from that day's plan. Symbols are now matched case-insensitively and saves merge with existing targets. Targets must be 0–100% (field error, Save disabled, 400 server-side), duplicates are rejected, a cleared field no longer snaps to 0, and rows no longer re-sort while typing.
- **Research with a one-letter ticker (e.g. `F`) or no ticker showed skeletons forever** — one-letter tickers load, and `/research` shows a "Search for a ticker" empty state. Identical error toasts from one upstream failure collapse into one.
- **Ticker links weren't URL-encoded** — `AT&T` researched "AT". Every link into Research now encodes the symbol; the ⌘K palette no longer lists Research twice.
- `/live/history` rejects unknown `range` values instead of returning `[]`.
- **Unknown routes rendered a blank page** — they now show a "Page not found" view.
- **Dashboard** — Cost Basis sorts; the Recommendation header is no longer a dead sort button; a type/account filter with no matches says so instead of "No holdings yet"; `priceDate` is sent as ISO.
- **IPO pages and the AI Portfolio Review showed "not found" / "not configured" when the request actually failed** — they now show an error state and toast.
- **Logs** — the API client uses `catchCustomError`, Clear asks for confirmation and confirms success, the viewer no longer overflows on mobile, and lines are coloured by their actual timestamp / level / label / message parts.

---

## [4.9.0] – 2026-09-17

### Added
- **Movers link through to research** — Every row in Today's gainer and loser lists — your own holdings and the market-wide top ten — is now clickable and opens that ticker's research page. The research page shows a "Back to Today" control when it was reached that way, so looking up one mover is a two-click round trip instead of a detour through the sidebar.

### Fixed
- The recent-searches list recorded the previously viewed ticker rather than the one being opened, because the entry was written from state the same render had not yet updated.

---

## [4.8.0] – 2026-09-17

### Fixed
- **Research refresh handed back the stale price it was pressed to replace** — every per-symbol live endpoint served its cache and only revalidated in the background, so pressing refresh on the Research page re-rendered the same quote and the click looked like it did nothing. The button now sends `?refresh=1`, which waits for live data before responding, and spins while it does. The same applies to the profile, news, ratings, fundamentals, peers, earnings and insider cards behind it.

### Added
- **`?refresh=1` on the per-symbol live routes** — `/live/quote`, `/live/recommendation`, `/live/news`, `/live/company-profile`, `/live/metrics`, `/live/peers`, `/live/earnings`, `/live/earnings-history` and `/live/insider` now accept the same force-refresh flag the market-news routes already had. Without it their stale-while-revalidate behaviour is unchanged, so polling still never blocks on Finnhub.

### Changed
- The Research header quote refreshes itself every 60s while the tab is visible, and again the moment the tab is refocused, instead of showing whatever price it loaded with until the user navigated away.
- The quote timestamp now carries a tooltip with the time the price was last checked, so a trade time that lags the clock is distinguishable from a quote that stopped updating.

---

## [4.7.0] – 2026-08-27

### Added
- **Actual earnings results** — Earnings alerts now follow the heads-up with the numbers themselves: EPS reported against consensus, the surprise percentage, and revenue against expectation. The figures are in the notification title too, so a phone banner shows the result without being opened. The Settings test send now demonstrates both halves when result alerts are on.
- **Recently Reported card** — The dashboard gains a card listing holdings that reported in the last 14 days with actual EPS against estimate, revenue, and a beat/miss chip, alongside the existing upcoming-earnings card. Backed by a new `/analytics/earnings-results` route.

### Fixed
- **Result alerts never fired** — The follow-up with the actual numbers matched Finnhub's earnings history on `period === report date`, but `period` is the *fiscal quarter end*, not the announcement day (NVDA's quarter ended Jul 2026 and was reported on Aug 26), so the match never succeeded and every report was abandoned after five days. Results are now read from the earnings calendar's published actuals, falling back to the history endpoint matched on the latest quarter that closed on or before the report.
- A report is followed to its result even when its heads-up never went out — quiet hours, a restart, or turning result alerts on after the fact. Previously only reports the app had successfully reminded about were ever resolved.

### Changed
- The earnings calendar window now reaches 14 days into the past as well as four months ahead, so one request serves both the upcoming card and the reported results.

---

## [4.6.1] – 2026-08-27

### Changed
- Dependency updates, landed together with a regenerated lockfile: `@anthropic-ai/sdk` 0.117.1 → 0.120.0, `@google/genai` 2.17.1 → 2.18.0, `@mui/x-charts` and `@mui/x-data-grid` 9.11 → 9.12, `apexcharts` 6.8.0 → 6.10.0, `react-dropzone` 20.1.1, `vite` 8.2.2, `@vitejs/plugin-react` 6.1.0, `@types/react-dom` 19.2.5 and `@biomejs/biome` 2.5.8 → 2.5.10 across all three manifests.

---

## [4.6.0] – 2026-08-27

### Added
- **Documentation site** — A VitePress site under `docs/`, published to GitHub Pages, replacing the four loose Markdown files that lived there. Covers a guide (getting started, configuration, Docker, importing a portfolio, backups, troubleshooting, FAQ), a page per feature, and a reference section: the full REST API surface, every environment variable, the data models, and the defaults and cadence of every background service. Local search, dark mode and the app's own brand palette come with it. `pnpm docs:dev`, `pnpm docs:build` and `pnpm docs:preview` drive it.
- **GitHub Pages CI** — A `Docs` workflow builds the site on every pull request that touches `docs/` and deploys it to Pages on every push to `develop`. The build fails on dead internal links, so a broken cross-reference is caught in review rather than shipped.

### Changed
- The README is rewritten for an open-source audience: badges, an accurate feature summary (rebalancing, the four alert conditions, MQTT notifications, broker and AI-assisted imports), quick starts for both local and Docker, the architecture diagram, and an explicit statement of the AI data-privacy boundary with links into the documentation site.
- The engineering docs (architecture, design system, UI conventions, error handling) moved to `docs/internals/` and gained a page on the AI data-privacy rule explaining the three tiers of AI feature and how the local-only restriction is enforced in code. The architecture page now documents the background services and the notification pipeline.

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
- The Research page no longer refetches everything from Finnhub on every view. Company profile, key metrics, peers, the earnings date, earnings history, insider transactions and company news are cached and revalidated in the background, so reopening a ticker paints from what was already fetched instead of sitting on skeletons. Measured against a stub upstream: a repeat view went from nine live calls to none, and from ~370 ms to ~30 ms.
- Background quote and recommendation refreshes — the ones the dashboard's 30-second poll kicks off across every holding — now run at bulk priority. Nothing is waiting on them, and at interactive priority they were enough to keep the shared Finnhub budget spoken for while a page you were looking at queued behind them.
- Finnhub requests are now prioritised rather than served strictly first-come-first-served. Background fan-outs that want one call per holding (portfolio news, news sentiment, the news watcher) yield to whatever page you are actually looking at, and can only spend part of the per-minute budget, so a page load never queues behind them. Portfolio news also polls a rotating slice of holdings per refresh and merges with what earlier refreshes found, instead of calling Finnhub once per holding every time.
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
