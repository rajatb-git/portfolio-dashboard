# Importing your portfolio

Everything in the app — live values, tax lots, realized gains, analytics,
alerts — builds on what you import, so the **Import** page (in the sidebar,
and offered by the Dashboard until you have holdings) walks you through it
one step at a time. Nothing is saved until you have reviewed every row.

## 1. Decide what to import

| You have | Import it as | You get |
|---|---|---|
| A **positions** export (what you hold today) | Current positions | One holding per symbol. If the file lists **tax lots** — a *date acquired* per purchase — each row becomes its own lot with that date and cost |
| An **activity / history** export | Transaction history → *Build positions and tax lots* | Your buys and sells replayed oldest first: positions, open lots (sells relieve the oldest lots first, FIFO) and realized gains |
| Both | Positions first, then history → *Record as history only* | Holdings and lots from the positions file, realized gains from the history, with nothing counted twice |

Build from history only when the file goes back to your first purchase of
each position; otherwise a sale shows up that the file never saw you buy, and
the import says so rather than guessing.

## 2. Pick the account

Each brokerage account is imported separately; you can create the account
(with its tax treatment) right in the flow. If the account already has data
you choose to **add** to it or to **start fresh**, which removes the account's
positions and transactions first (a history-only import removes just the
transactions).

Adding works so that importing the same file twice changes nothing:

- A **positions** file is a snapshot of what you hold now. Each symbol it
  lists replaces that symbol's lots in the account (the review shows the old
  and new quantity), symbols it doesn't list are left alone, and its cash
  line *sets* the cash balance rather than adding to it.
- In a **history** file, trades, deposits and withdrawals already in the
  account (same day, quantity and price) are skipped as duplicates, and a
  stock split an earlier import already applied isn't applied again.

## 3. Drop the file

- **CSV / TSV exports** are read directly. The page finds the header row even
  under an account banner or blank lines, ignores footers and disclaimers, and
  matches columns automatically for Fidelity, Schwab, Robinhood, Vanguard,
  Coinbase and most other brokers. You can change any match.
- **PDF statements, OFX/QFX and pasted text** are read by your **local AI**
  (see below) and land in the same review.

A file with several accounts (an *Account Number* column) asks which one goes
into this account; import the others into their own accounts afterwards.

## 4. Review

The review shows every row with its status and the reason for it:

- **Ready** / **Check** — will be imported; *Check* explains anything to look
  at, such as a lot without a purchase date (imported as *estimated*).
- **Problem** — can't be imported as it is (no cost basis, a date that doesn't
  read, a sale of more shares than held, …). Fix the file and choose it again,
  or untick the row to import the rest.
- **Skipped** — not a position or trade: totals, pending activity, options
  contracts, dividends, interest, fees, transfers without a direction.
- **Duplicate** — already in the account.

Click the pencil on any row to correct it — useful when the local AI misread
a line — and it's checked again straight away. Unticked and corrected rows
apply to this file only.

Settings on the same screen update the plan as you change them: the date
format (detected from the file when it can be), the asset type for rows that
don't say, **decimal commas** (`1.234,56`, detected for European exports),
whether a positions file without a cost column uses today's price as an
estimated cost, and whether cash rows / cash movements update the account's
cash.
The summary shows the positions and lots you will end up with, transactions,
realized gain and cash before and after.

Broker wording is understood — *YOU BOUGHT*, *Sold*, *Reinvest Shares*,
*Electronic Funds Transfer Received*, *ACH* with a signed amount — as are
`$1,234.56`, `(12.50)` negatives, `BTC-USD` style pairs, money-market lines
such as `SPAXX**` (cash) and dates like `3/4/2026`, `2026-03-04` or
`Mar 4, 2026`. When building positions:

- A trade's **fees** are included: a buy's cost and a sale's proceeds come
  from the amount column when it's there.
- **Stock splits** (*DISTRIBUTION*, *SPL*, *Stock Split*) multiply each held
  lot's shares and divide its cost per share, keeping its date.
- **Reinvested dividends** with a share quantity are buys; the matching cash
  dividend line is skipped. Short sales and covers are skipped, since short
  positions aren't tracked.

## After importing

- Undated lots are marked *estimated*: set their purchase dates on each
  position's Research page so short- and long-term gains are right.
- An imported trade that is history only can be edited or deleted freely; one
  that built a position undoes its lots when deleted, just like a trade
  entered in the app.
- Changing an imported buy's date also moves that date on the sales that
  relieved its lot, so holding periods stay right.
- The performance chart skips the day of an import, because the portfolio
  changed without a trade it could account for.
- **Recent imports** on the Import page lists what was imported, when and into
  which account.

## AI-assisted reading (local only)

::: warning This feature is local-only, by design
A brokerage statement is about as personal as data gets, so document reading is
**hard-locked to a local Ollama provider**. If your AI provider is set to Claude
or Gemini, the app refuses the request rather than uploading your statement.
Set **Settings → AI Agent → Provider** to *Ollama (Local)* to use it. See the
[AI data-privacy rule](/internals/ai-privacy).
:::

The browser extracts the text (PDFs keep their table rows together) and
sends it to your Ollama host one part at a time, with a larger context
window, so a long statement isn't silently cut off. The page shows which part
it's on and how long it has taken; **Cancel** stops it and keeps the rows
read so far, and a part that fails or times out is reported without losing
the others. Expect a few minutes per page on a CPU-only machine. A model can
miss or misread lines, so compare the review with your statement and correct
rows with the pencil before importing. Documents are capped at 200,000
characters.

## Adding a position by hand

**Database → Holdings → Add** still works for a single position, and buys and
sells afterwards go through the **Buy / Sell** dialog, which updates the
position, its lots and the account's cash.

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
