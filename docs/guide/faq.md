# FAQ

## Is there a hosted version?

No. Portfolio Dashboard is self-hosted by design: it is a single-user app that
runs on your machine against your own MongoDB. There is no service to sign up
for and nowhere for your positions to be stored but your own database.

## Does it place trades?

No. It is read-only with respect to your broker — it never connects to one.
"Buy" and "Sell" in the app record a transaction and adjust your recorded
position and cash balance; they do not send an order anywhere.

## Is my financial data sent to Claude or Gemini?

No. Personal financial data — quantities, cost basis, P&L, account names,
portfolio values — is never sent to a hosted AI provider. Features that need to
see your positions (portfolio insights, AI document import) are hard-locked to a
**local Ollama** provider. The features that may use a hosted provider send only
public market data for a single ticker. See
[the AI data-privacy rule](/internals/ai-privacy).

## Do I have to use AI at all?

No. AI is off by default and every other feature works without it.

## Which market data providers does it use?

[Finnhub](https://finnhub.io/) for quotes, recommendations, news, metrics,
peers, earnings, insider transactions, company profiles and the IPO calendar
(free API key required), and NASDAQ for price history (no key). Both are called
only from the backend, which caches and rate-limits them.

## Is the data real-time?

Not streaming. Quotes are fetched on demand and cached briefly; the dashboard's
refresh button is the main interaction. Background services poll on their own
schedules (5–15 minutes by default) to evaluate alerts.

## Does it handle multiple accounts?

Yes — holdings and transactions belong to a brokerage account, each with its own
cash balance, and the dashboard aggregates across all of them.

## Does it support crypto?

Yes. Holdings are typed `stock` or `crypto`, and crypto can be watched 24/7 by
the move-alert service while equities are restricted to market hours.

## What about options, bonds or mutual funds?

Not as first-class instrument types. Anything Finnhub quotes as a symbol can be
tracked as a `stock` holding, but there is no options-specific modelling
(strikes, expiries, greeks).

## Does it do tax reporting?

It reports **realized gains** and flags **tax-loss harvesting candidates** in
[Analytics](/features/analytics). It is not tax software and does not produce
filings or account for wash-sale rules.

## Can I run it on a Raspberry Pi / ARM machine?

Yes — the published container images are built for `linux/amd64` and
`linux/arm64`.

## Can I use MongoDB Atlas instead of a local Mongo?

Yes. Any reachable connection string works. Remember that the free tier's
network access list must include the machine running the backend.

## How do I move my data to another machine?

Export a zip from **Settings → Data**, bring the app up on the new machine, and
import it. See [Backups & restore](/guide/backups).

## How do I upgrade?

Pull and rebuild (`git pull && pnpm install && pnpm -r build`), or bump the
image tag if you run the published containers. Take a backup first.

## Is there authentication?

Only an optional passcode **app lock** with auto-lock — enough to keep a
dashboard on a second monitor from being read by whoever walks past. It is not
multi-user auth. Do not expose the app to the public internet without putting
your own authenticating proxy in front of it.

## How can I contribute?

Read [Contributing](/internals/contributing). Bug reports, features, docs and
tests are all welcome — the one non-negotiable rule is the AI data-privacy
boundary.

## What licence is it under?

[MIT](https://github.com/rajatb-git/portfolio-dashboard/blob/develop/LICENSE).

## Is any of this financial advice?

No. The app reports on data you enter and data it fetches from public APIs, and
any AI-generated commentary is a language model's opinion on public information.
Verify anything you act on.
