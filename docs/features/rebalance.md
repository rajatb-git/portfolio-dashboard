# Rebalance

Allocation drift is easy to see and annoying to compute. The Rebalance page
takes your target weights and turns them into "sell $X of A, buy $Y of B".

## Setting targets

Assign a **target percentage** per symbol. Symbols you never touch default to
their *current* weight, so an untouched portfolio starts at zero drift rather
than screaming that everything is wrong.

Targets are saved with an explicit **Save** button and stored in MongoDB
(`rebalance_target_config`), so they travel with your
[backups](/guide/backups).

## The plan

For each symbol the page shows:

| Column | Meaning |
|---|---|
| Current value / % | Market value aggregated **across all accounts**, and its share of the portfolio |
| Target % / value | Your target weight and what it is worth at today's total |
| Drift % | Current minus target — positive means overweight |
| Action | `buy`, `sell` or `hold` |
| Trade value | The dollar amount that closes the gap |
| Shares | Approximate share count for that trade at the current price |

Plus portfolio-level figures: total value, total target percentage (so you can
see whether your targets add up to 100), and **total drift** — the sum of
absolute drift, a single "how far off am I" number.

::: tip Drift under 0.5% is treated as noise
Anything inside half a percent is reported as `hold` rather than generating a
trade that costs more in spread than it corrects.
:::

## Things worth knowing

- Positions are aggregated **per symbol**, not per account. If you hold AAPL in
  two accounts, the plan treats it as one line — deciding which account to trade
  in is left to you.
- Share counts are approximate: they assume you can trade fractionally and that
  the price does not move while you act.
- The plan is computed from the same live dashboard data, so it is as fresh as
  your last refresh.
- Nothing is executed. The app never connects to a broker — record the trades
  afterwards through the Buy / Sell dialog if you want your positions to follow.

## Related

- [Analytics → Allocation](/features/analytics) — where the drift comes from
- [REST API](/reference/rest-api#rebalance)
