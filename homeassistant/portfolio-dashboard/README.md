# Portfolio Dashboard

Self-hosted dashboard for tracking stock and crypto holdings across multiple
accounts, packaged as a Home Assistant add-on.

Live market data from Finnhub and NASDAQ, optional AI-generated equity
analysis via Claude / Gemini / Ollama, portfolio analytics, watchlist,
IPO calendar, and an import/export backup flow.

## Install

1. In Home Assistant, go to Settings -> Add-ons -> Add-on Store.
2. Open the menu (top-right) -> Repositories.
3. Add: `https://github.com/rajatb-git/portfolio-dashboard`
4. Find "Portfolio Dashboard" in the store and install it.
5. Configure your Finnhub credentials (see DOCS.md), then start the addon.
6. Open it from the Home Assistant sidebar - the "Portfolio" panel uses
   Ingress, no port forwarding required.

See [DOCS.md](DOCS.md) for configuration options and usage notes.
