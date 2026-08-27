# Research & AI insights

The Research page is a per-ticker deep dive. Search a symbol (or press ⌘K and
type one) and every card on the page loads in parallel.

## What is on the page

| Card | Contents |
|---|---|
| **Details** | Company profile and live quote — price, day range, market cap, industry, exchange |
| **Metrics** | Fundamentals: valuation ratios, margins, growth, returns |
| **Peers** | Comparable tickers, one click away |
| **News** | Recent headlines with sources and links |
| **Earnings history** | Reported vs estimated EPS, with surprises |
| **Insider transactions** | Recent insider buying and selling |
| **AI insights** | An AI-written synthesis of everything above — optional |
| **Notes** | Your own free-text notes on the ticker, saved per symbol |
| **Position details** | Your holding in this symbol, if you have one |
| **Transactions** | Your buy/sell history for this symbol |

Every card fails independently: a missing peers list does not take the page
down, and any failure raises a toast rather than a blank card.

## AI insights

When AI is enabled in **Settings → AI Agent**, the page also requests an
insight for the ticker. The backend builds a prompt from seven public data
sources it has already fetched — profile, quote, analyst recommendations,
metrics, peers, earnings and news headlines — and asks the model for strict
JSON:

```json
{
  "summary": "…",
  "sentiment": "bullish | bearish | neutral",
  "rating": "buy | hold | sell",
  "rationale": "…",
  "keyPoints": ["…"],
  "risks": ["…"],
  "catalysts": ["…"]
}
```

The response is cached **per symbol for 6 hours** (key `agent_insight_<SYMBOL>`),
so revisiting a ticker is instant and your provider quota is not burned on
re-reads. The card records which provider and model produced it, and when.

### Providers

| Provider | Runs | Default model |
|---|---|---|
| Ollama (Local) | On your machine | `llama3.1` |
| Claude | Anthropic API | `claude-sonnet-4-6` |
| Gemini | Google API | `gemini-2.0-flash` |

Keys are entered in-app and stored in MongoDB, never in `.env`.

### What is actually sent

::: info Public market data only
Ticker insights are the **one** feature allowed to call a hosted provider, and
the prompt contains nothing but publicly available market data for a single
symbol — the same data anyone can pull from Finnhub. It does not include your
quantity, cost basis, gain/loss, account, or the fact that you hold the symbol
at all.

Features that *do* need your positions — portfolio insights on
[Analytics](/features/analytics), AI document import on
[Database](/guide/importing-data) — are hard-locked to a local Ollama provider
and refuse to run against a hosted API.

The full rule, and how it is enforced in code, is in
[the AI data-privacy rule](/internals/ai-privacy).
:::

### If insights fail

A failed insight renders a distinct error state — not a "feature not
configured" message — so you can tell a misconfiguration from an outage. Common
causes are in [Troubleshooting](/guide/troubleshooting#ai-insights-fail).

## Related

- [Alerts & notifications](/features/alerts) — get told about news instead of
  looking for it
- [REST API](/reference/rest-api#live-market-data) — every `/live/*` endpoint
