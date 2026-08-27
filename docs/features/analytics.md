# Analytics

The Analytics page is where the portfolio stops being a list of positions and
starts being a shape: how concentrated it is, where the returns came from, how
much risk you are carrying and what the tax consequences look like.

## Performance

**Portfolio performance chart** — total value over time, drawn from daily
snapshots. Snapshots are written whenever the dashboard is built, and can also
be captured on a timer by the
[Portfolio Value Tracker](/reference/background-services) service.

**Monthly returns** — a year × month grid of percentage returns, so seasonality
and bad quarters are visible at a glance. Months without comparable data are
left blank rather than zeroed.

**Performance attribution** — per holding: total and day gain/loss, portfolio
weight, and **contribution to return** — the honest answer to "what actually
moved the needle", which is rarely the position with the biggest percentage
gain.

**Realized gains** — closed lots reconstructed from your transaction history,
each with acquired and sold dates, proceeds, cost basis and gain, rolled up per
year and split into **short-term and long-term**.

## Risk

**Risk metrics** — annualized return, volatility, Sharpe ratio, maximum
drawdown and beta, computed from the price history of your holdings, along with
how many days of data the figures are based on. Short history means weak
numbers, and the card says so.

**Correlation matrix** — pairwise Pearson correlation of daily returns across
your holdings, plus an average correlation and a 0–100 **diversification
score**. Symbols without enough history are listed as skipped rather than
silently dropped.

## Allocation

**Allocation charts** — the split by asset class and by holding.

**Sector allocation** — sector weights, resolved from company profiles and
cached aggressively (sector data changes about as often as a company changes
business).

## Income

**Dividend income** — per holding: amount per share, annualized dividend,
yield, **yield on cost**, annual income, and the next ex-dividend and payment
dates with the expected amount. Summarised as total annual income and average
monthly income.

## Tax

**Tax-loss harvesting** — positions currently underwater, with the unrealized
loss in dollars and percent, split short- and long-term, plus a **wash-sale
risk** flag and the date on which a recent purchase stops tainting a harvested
loss. Totals distinguish the full unrealized loss from what is
*harvestable now*.

::: warning Not tax advice
These are candidates and estimates from the data you entered. Confirm anything
you act on with your own records and a professional.
:::

## Goals

**Portfolio goal** — set a target value and optionally a target date. The card
tracks progress, derives a monthly growth rate from your snapshots, projects
when you would reach the target at that rate, and — if you set a date — whether
you are on track and what monthly return would be required.

## News sentiment

**News sentiment** — aggregate sentiment across recent stories about your
holdings, so a portfolio-wide mood shift is visible without reading every
headline.

## Portfolio insights (AI, local only)

An AI-written review of concentration, asset-class balance, diversification and
performance dispersion, with concrete rebalancing suggestions.

::: danger Local Ollama only
This feature sends your holdings, weights and P&L to a model, so it is
**hard-locked to a local Ollama provider** and refuses to run against Claude or
Gemini. See [the AI data-privacy rule](/internals/ai-privacy).
:::

## Related

- [Rebalance](/features/rebalance) — turn allocation drift into trades
- [REST API](/reference/rest-api#analytics) — every endpoint on this page
