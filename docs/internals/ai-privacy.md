# The AI data-privacy rule

This is the one rule in the codebase that is never bent, and it is worth
understanding whether you are running the app or contributing to it.

::: danger The rule
**Personal financial data is never sent to an external AI provider.**
:::

Personal financial data means: holding quantities, cost basis, purchase and
average prices, gain/loss amounts and percentages, portfolio dollar values,
account IDs and names, transaction history, and target prices.

## The three tiers

Not every AI feature is treated the same, because not every AI feature needs the
same data.

### 1. Public data → any provider

**Ticker insights** (`AgentInsightsController`, `GET /live/agent-insights/:sym`)
and **IPO insights** (`IPOInsightsController`) are the only features permitted
to call `getActiveProvider()` — meaning they may run against Claude, Gemini or
Ollama, whichever you configured.

They are allowed to because their prompts contain **only publicly available
market data for a single symbol**: company profile, price, analyst ratings,
metrics, peers, earnings and news headlines — all of it retrievable by anyone
from Finnhub or NASDAQ. The prompt does not say how many shares you own, what
you paid, what it is worth, which account it sits in, or even that you hold the
symbol at all.

### 2. Personal data → local Ollama only, enforced in code

**Portfolio insights** (`PortfolioInsightsController`,
`POST /analytics/portfolio-insights`) and **AI document import**
(`DocumentImportController`, `POST /ai-import/parse`) genuinely need your
positions — the first analyses concentration and P&L dispersion, the second
parses your brokerage statement.

So they do not use `getActiveProvider()` at all. They construct
`OllamaProvider` directly and reject the request outright if the configured
provider is anything else:

> *"Portfolio AI analysis only runs on a local Ollama provider to keep your
> financial data private. Switch the AI provider to Ollama in Settings."*

> *"Document import is restricted to local AI. Set the AI Agent provider to
> 'Ollama (Local)' in Settings so your statements never leave this machine."*

The restriction is structural. There is no setting that turns it off, and no
code path that reaches a hosted API with this data.

### 3. Everything else → no AI at all

The dashboard, analytics, alerts, rebalancing and notifications compute their
numbers locally. AI is opt-in and additive; the app is fully usable with it
switched off.

## For contributors

Before implementing anything that calls `getActiveProvider()` or an AI SDK
directly, ask one question:

> **Does this prompt contain the user's holdings, quantities, values or P&L?**

If yes, it does not get built against a hosted provider — full stop. Lock it to
`OllamaProvider` like the two features above, or do not build it. If you think
you have a case for an exception, open an issue and discuss it before writing
code; a PR that sends personal financial data to a hosted API will not be
merged.

Practical checks when reviewing an AI change:

- Does the feature call `getActiveProvider()`? Then read the prompt builder line
  by line and confirm every field is public market data.
- Does it construct a provider directly? Confirm it is `OllamaProvider` and that
  a non-Ollama config is rejected *before* the prompt is built.
- Does an error message leak position data into logs? Winston output is written
  to disk and readable from the Logs page.

## For operators

- **Using Ollama?** Nothing leaves your machine for any AI feature. This is the
  configuration to pick if you want the whole surface with none of the exposure.
- **Using Claude or Gemini?** Ticker and IPO insights call that API with public
  data about one symbol. Portfolio insights and document import will refuse to
  run until you switch to Ollama.
- **API keys** are stored in MongoDB (`ai_config`) and are therefore included in
  [backup zips](/guide/backups). Treat an export as sensitive.

See also: [Research & AI insights](/features/research),
[Analytics](/features/analytics), [Importing your portfolio](/guide/importing-data).
