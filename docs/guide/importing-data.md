# Importing your portfolio

There are four ways to get positions and history into the app, from most
structured to most forgiving. All of them live on the **Database** page, and all
of them attach rows to a brokerage **account** — so create the account first
under **Database → Accounts**.

## 1. By hand

**Database → Holdings → Add**. Symbol, name, quantity, average price, account
and type (`stock` or `crypto`). Fine for a handful of positions, and the only
way to fix a single bad row.

Buys and sells afterwards go through the **Buy / Sell** dialog, which updates
the position, adjusts the account's cash balance and writes a transaction.

## 2. Generic CSV

**Database → Holdings → Import** takes a plain CSV with these columns:

```csv
symbol,name,qty,averagePrice
AAPL,Apple Inc,25,178.42
BTC,Bitcoin,0.15,42150.00
```

`symbol`, `name`, `qty` and `averagePrice` are required. You pick the account
and the holding type in the dialog, so those are not columns.

::: tip A `CASH` row sets your opening balance
A row whose symbol is `CASH` is not imported as a position — it adjusts the
account's cash balance by `qty × averagePrice` instead.
:::

Transactions have their own importer (**Database → Transactions → Import**),
requiring at least `qty` and `action` (`buy`, `sell`, `deposit` or `withdraw`).

## 3. Broker CSV exports

If you exported straight from your broker, use the **broker import** dialogs
instead — they know the column names each one uses, for both holdings and
transaction history:

| Broker | Holdings export | Transaction export |
|---|---|---|
| Robinhood | Symbol, Name, Shares, Average Cost | ✅ |
| Charles Schwab | ✅ | ✅ |
| Fidelity | ✅ | Settlement Date, Action, Symbol, Quantity, Price |

Pick the broker, drop the file in, review the parsed rows, then confirm.

## 4. AI-assisted import (any format)

**Database → Import with AI** accepts a PDF statement, CSV, TSV, plain text,
OFX/QFX — or text you paste in — and lets a local model work out the columns.
Useful for a brokerage the built-in parsers do not cover, or for a PDF that was
never meant to be machine-readable.

::: warning This feature is local-only, by design
A brokerage statement is about as personal as data gets, so document import is
**hard-locked to a local Ollama provider**. If your AI provider is set to Claude
or Gemini, the app refuses the request rather than uploading your statement.
Set **Settings → AI Agent → Provider** to *Ollama (Local)* to use it. See the
[AI data-privacy rule](/internals/ai-privacy).
:::

The parser extracts text in the browser (PDFs included), sends the text to your
Ollama host through the backend, and shows you a reviewable table of rows —
plus anything it skipped — before anything is written. Documents are capped at
200,000 characters.

## Restoring a full backup instead

If you are moving between machines rather than onboarding, do not re-import
CSVs — restore the zip. See [Backups & restore](/guide/backups).

## Coming from a pre-MongoDB version

Older builds stored data in an on-disk `storage/` directory. To migrate:

```sh
pnpm run migrate:mongo
```

It reads the old `storage/*.json` files straight into MongoDB and only
populates collections that are still empty, unless you pass `--force`. The old
server does not need to be running.
