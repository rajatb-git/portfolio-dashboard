# Alerts & notifications

The app can watch your portfolio while you are not looking at it. Everything
here runs as a background service in the backend, and everything publishes
through the same MQTT transport — which means the alerts land wherever your
broker routes them: Home Assistant, ntfy, a phone, a script.

## Price alerts

Create alerts per symbol on the **Alerts** page. Four condition types:

| Condition | Triggers when |
|---|---|
| **Price** | The price crosses a fixed target, above or below |
| **Trailing stop** | The price falls `trailPercent` from the highest price seen since the alert was armed |
| **% from high** | The price falls `thresholdPercent` below the 52-week high |
| **Cost basis** | The price crosses what the position actually cost you |

Each alert records when it triggered, the last price seen and when it was last
checked; the trigger clears itself when the condition stops holding, so an alert
is armed again rather than needing to be recreated.

The **Price Alert Monitor** evaluates them in the background — enabled by
default, every 5 minutes.

Browser notifications can be enabled separately under **Settings → Dashboard →
Browser Price Alerts** and need no broker at all.

## Move alerts

Big-move detection for holdings and for the portfolio as a whole, with two
distinct trigger kinds:

- **Threshold** — the day change crosses a configured level (default 5%), with
  **escalation**: each further step (default 3%) alerts again, so a stock in
  free-fall does not go quiet after the first message.
- **Spike** — a sharp move inside a short rolling window (default 2% in
  30 minutes), which catches an intraday shock a day-change threshold would miss.

Options: **watch crypto 24/7** (on by default — crypto does not keep market
hours) and **cover after hours**.

## News alerts

Watches headlines for your holdings and, optionally, the broad market. Defaults
to **breaking only**, with a lookback window (6 hours), a cap on alerts per run
(5) and a 15-minute check interval. Stories already seen are remembered so the
same headline does not arrive twice.

## Earnings alerts

Reminds you a configurable number of days before a holding reports (default: 1),
and optionally follows up with the **results** once they are out.

## Dividend alerts

Reminders for **ex-dividend** and **payment** dates on your holdings, a
configurable number of days ahead (default: 3).

## IPO alerts

- **IPO reminders** — for IPOs on your watchlist, ahead of the pricing date
  (default: 1 day, enabled by default).
- **IPO announcements** — a notification when a new IPO appears on the calendar.

See [IPO calendar](/features/ipo-calendar).

## Trading summaries

Three recaps per trading day — **9:35 ET**, **12:30 ET** and the **close** —
covering how the portfolio did and your top holdings (3, 5 or 10). A summary
whose slot passed while the backend was down is delivered when it comes back up
rather than skipped.

## Quiet hours

Overnight windows where notifications are held back. Configure a start and end
hour, and pick a mode:

| Mode | Behaviour |
|---|---|
| **Digest** | Hold messages and release them together when the window ends |
| **Suppress** | Drop them entirely |

**Let big moves through** overrides the window for anything above a critical
threshold (default 10%), so a real emergency still wakes you. Held messages can
be flushed manually.

## Notification history

The **Notifications** page lists everything the app has sent, so you can see
what fired while you were away — and confirm a service is working before you
trust it. History can be cleared or pruned.

## Transport: MQTT

Configure the broker once under **Settings → Alert Notifications**:

| Field | Notes |
|---|---|
| Broker URL | `mqtt://host:1883` or `mqtts://host:8883` |
| Username / Password | Optional |
| Topic | Default `portfolio-dashboard/alerts` |
| QoS | 0 or 1 |
| Retain | Whether the broker keeps the last message |

Each service can publish to its own topic — `portfolio-dashboard/news`,
`/earnings`, `/dividends`, `/summary`, `/ipo-announcements` — so subscribers can
filter by category.

The connection is a single persistent client with automatic reconnect. **Failures
never throw into the app**: a message published while the broker is unreachable
is logged as dropped, so a dead broker degrades your alerts, not your dashboard.

::: tip Wiring it to Home Assistant
Point the app at your existing MQTT broker and subscribe to
`portfolio-dashboard/#`. Every payload carries a title and a message, so a
notify automation needs no parsing.
:::

## Defaults and cadences

Every service's default interval, threshold and topic is tabulated in
[Background services](/reference/background-services).

## Related

- [Troubleshooting → Notifications never arrive](/guide/troubleshooting#notifications-never-arrive)
- [REST API](/reference/rest-api#alerts)
