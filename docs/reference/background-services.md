# Background services

The backend starts a set of independent services on boot, each reading its own
config document from MongoDB and rescheduling itself when you save changes in
Settings — no restart required.

## What runs

| Service | Default | Cadence | Publishes to |
|---|---|---|---|
| **Market status** | always on | refreshes every 45 s | — |
| **Price alert monitor** | **enabled** | every 5 min | `portfolio-dashboard/alerts` |
| **Move alerts** | disabled | every 15 min | `portfolio-dashboard/alerts` |
| **News watch** | disabled | every 15 min | `portfolio-dashboard/news` |
| **Earnings reminders** | disabled | hourly poll | `portfolio-dashboard/earnings` |
| **Dividend watch** | disabled | every 6 h | `portfolio-dashboard/dividends` |
| **IPO reminders** | **enabled** | every 6 h | `portfolio-dashboard/alerts` |
| **IPO announcements** | disabled | every 6 h | `portfolio-dashboard/ipo-announcements` |
| **Trading summaries** | disabled | 3 slots per trading day | `portfolio-dashboard/summary` |
| **Portfolio value tracker** | disabled | every 15 min | — (writes snapshots) |
| **Scheduled backups** | disabled | every 24 h | — (writes zips) |
| **Quiet hours** | disabled | 22:00–07:00 | gates all of the above |

Everything that publishes goes through the single MQTT client configured under
**Settings → Alert Notifications**. If MQTT is not configured, messages are
logged as dropped — services keep running and the app is unaffected.

## Defaults in detail

### Price alert monitor

| Setting | Default |
|---|---|
| Enabled | `true` |
| Interval | 5 minutes |

Evaluates every saved alert, sets `triggeredAt` when the condition is met and
clears it when it stops holding.

### Move alerts

| Setting | Default | Meaning |
|---|---|---|
| Enabled | `false` | |
| Interval | 15 minutes | |
| Move threshold | 5% | Day change that triggers an alert |
| Escalation step | 3% | Each further step re-alerts |
| Spike threshold | 2% | Move inside the spike window |
| Spike window | 30 minutes | |
| Watch crypto 24/7 | `true` | Crypto keeps no market hours |
| Cover after hours | `true` | Include extended sessions |

### News watch

| Setting | Default |
|---|---|
| Enabled | `false` |
| Interval | 15 minutes |
| Topic | `portfolio-dashboard/news` |
| Watch your holdings | `true` |
| Watch market headlines | `true` |
| Breaking only | `true` |
| Max alerts per run | 5 |
| Lookback window | 6 hours |

Seen headlines are remembered so a story does not arrive twice.

### Earnings reminders

| Setting | Default |
|---|---|
| Enabled | `false` |
| Notify ahead | 1 day |
| Follow up with results | `true` |
| Topic | `portfolio-dashboard/earnings` |

### Dividend watch

| Setting | Default |
|---|---|
| Enabled | `false` |
| Notify ahead | 3 days |
| Ex-dividend dates | `true` |
| Payment dates | `true` |
| Topic | `portfolio-dashboard/dividends` |

### IPO reminders and announcements

| Setting | Default |
|---|---|
| Reminders enabled | `true` |
| Remind me | 1 day before |
| Announcements enabled | `false` |
| Announcement topic | `portfolio-dashboard/ipo-announcements` |

### Trading summaries

| Setting | Default |
|---|---|
| Enabled | `false` |
| Top holdings | 5 (3, 5 or 10) |
| Topic | `portfolio-dashboard/summary` |

Three summaries per trading day: **9:35 ET**, **12:30 ET** and the **close**. A
slot fires once its time has passed and it has not been sent today — so a
backend that was down at 9:35 still delivers that day's summary when it comes
back up, instead of skipping it forever. Only the latest due slot is sent, so a
server first started in the evening gets one current close summary rather than a
burst of stale ones.

### Portfolio value tracker

| Setting | Default |
|---|---|
| Enabled | `false` |
| Interval | 15 minutes |

Writes `portfolio_snapshots` documents — the points behind the performance
chart and the goal projection. The dashboard also writes a snapshot whenever it
is built, so this service is about resolution, not existence.

### Scheduled backups

| Setting | Default |
|---|---|
| Enabled | `false` |
| Interval | 24 hours |
| Retention | keep 7 |

Zips land in `STORAGE_DIR/../backups`. Always targets the real database, even
in [Demo Mode](/features/demo-mode-and-lock).

### Quiet hours

| Setting | Default |
|---|---|
| Enabled | `false` |
| Window | 22:00 – 07:00 |
| Mode | `digest` (vs `suppress`) |
| Let big moves through | `true` |
| Critical threshold | 10% |

In `digest` mode, held messages are released when the window ends, or manually
via `POST /settings/quiet-hours/flush`.

## Operational notes

- Services are scheduled from the backend process. If the backend is not
  running, nothing fires — there is no external scheduler.
- Each service records its last run in `job_run_state`, so a restart does not
  replay the same alerts.
- All of them share the Finnhub rate-limit budget with the UI. Tightening
  intervals on a free key is the fastest way to see missing prices — see
  [Troubleshooting](/guide/troubleshooting).
- Every send is recorded in [notification history](/features/alerts#notification-history).
