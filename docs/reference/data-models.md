# Data models

Every record in MongoDB carries a common base, and each collection adds its own
fields on top.

```ts
interface ISkewerModel {
  id: string;         // application-level id (not Mongo's _id)
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
}
```

Models are declared once in `packages/backend/src/models/` and wrapped by
`MongoModel` (`utils/mongoModel.ts`), which gives each collection a schema, a
synchronous read API after `initialize()`, and consistent id handling.

## Core entities

### Account

A brokerage account. Holdings and transactions hang off one.

```ts
interface IAccount {
  name: string;
  cashBalance?: number;
}
```

### Holding

A position you own.

```ts
interface IHoldings {
  id: string;
  accountId: string;
  name: string;
  symbol: string;
  qty: number;
  averagePrice: number;
  type: 'stock' | 'crypto';
}
```

### Transaction

A buy, sell, deposit or withdrawal.

```ts
interface ITransaction {
  accountId: string;
  symbol: string;
  qty: number;
  price: number;
  type: 'stock' | 'crypto' | 'cash';
  action: string;   // buy | sell | deposit | withdraw
  pnl?: number;
  date?: string;    // real trade date for imported history
}
```

`createdAt` is always the insert time, which is why imported rows carry their
original trade date in `date`.

### Alert

A price watch. See [Alerts](/features/alerts) for what each condition means.

```ts
type AlertCondition = 'price' | 'trailing_stop' | 'pct_from_high' | 'cost_basis';

interface IAlert {
  symbol: string;
  type: 'stock' | 'crypto';
  condition: AlertCondition;
  targetPrice: number;
  direction: 'above' | 'below';
  trailPercent?: number;      // trailing_stop
  thresholdPercent?: number;  // pct_from_high
  note?: string;
  peakPrice?: number;         // maintained by the monitor
  triggeredAt?: string | null;
  lastPrice?: number;
  lastCheckedAt?: string;
}
```

### Portfolio snapshot

One point on the performance chart.

```ts
interface IPortfolioSnapshot {
  timestamp: string;  // ISO 8601, unique per calculation — used as the record id
  date: string;       // YYYY-MM-DD calendar day
  totalValue: number;
}
```

## Derived shapes

### HoldingAggregate

What `GET /dashboard` returns: a holding joined with live market data.

```ts
type HoldingAggregate = {
  accountId: string;
  name: string;
  symbol: string;
  qty: number;
  averagePrice: number;
  type: 'stock' | 'crypto';
  currentPrice: number;
  priceDate: string;
  percentChange: number;
  dayHigh: number;
  dayLow: number;
  originalValue: number;
  totalGL: number;
  totalGLPercent: number;
  marketValue: number;
  buy: number;
  hold: number;
  sell: number;
  strongBuy: number;
  strongSell: number;
};
```

::: warning `HoldingAggregate` has no `id`
It is not assignable to `IHoldings`. Key it by `symbol`, and narrow with
`Pick<IHoldings, …>` where a component needs to accept both shapes.
:::

## Configuration collections

Every in-app setting is its own single-document collection:

| Collection | Holds |
|---|---|
| `ai_config` | Provider, model, keys |
| `notification_config` | MQTT broker connection |
| `alert_monitor_config` | Price alert monitor cadence |
| `move_alert_config` | Move and spike thresholds |
| `news_watch_config` | News alert options |
| `earnings_reminder_config` | Earnings alert options |
| `dividend_watch_config` | Dividend alert options |
| `ipo_reminder_config` / `ipo_announcement_config` | IPO alerts |
| `trading_summary_config` | Daily summary options |
| `quiet_hours_config` | Quiet-hours window and mode |
| `value_calc_config` | Snapshot tracker cadence |
| `scheduled_backup_config` | Backup interval and retention |
| `rebalance_target_config` | Target weights |
| `portfolio_goal_config` | Goal value and date |
| `lock_config` | Passcode hash, salt, session secret, idle timeout |

Supporting collections cover caches (`cache`, `price_store`,
`recommendations`), notification bookkeeping (`notification_history`,
`held_notification`, `seen_news`, `job_run_state`), IPO tracking (`ipo`,
`watched_ipo`, `announced_ipo`) and per-ticker `notes`.

All of them are included in a [backup zip](/guide/backups).
