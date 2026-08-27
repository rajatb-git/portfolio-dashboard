# Backups & restore

Everything the app knows lives in MongoDB, and the whole of it can be moved
around as a single zip. Backups cover holdings, accounts, transactions, alerts,
snapshots, notes **and every in-app setting** — AI config, notification config,
lock config included.

## Export

**Settings → Data → Export Database** streams a zip straight to your browser.
Inside it is one JSON file per Mongo collection:

```
storage/
  holdings.json
  accounts.json
  transactions.json
  alerts.json
  portfolio_snapshot.json
  ai_config.json
  ...
```

Each file is a `{ "<id>": { …record } }` map — the same shape the app's old
on-disk store used, so old exports still restore cleanly.

The equivalent API call is `GET /settings/db/export`, which means a cron job on
another machine can pull a backup with `curl` if you would rather not click.

## Restore

**Settings → Data → Import Database**, drop the zip, confirm the dialog.

::: danger Import replaces, it does not merge
For every collection present in the zip, the backend **deletes all existing
documents and inserts the ones from the file**. A holding you added since the
backup was taken is gone after the restore.

The backend validates every entry before writing anything, and snapshots the
current state as a safety backup first — but treat a restore as a destructive
operation and take a fresh export beforehand.
:::

Collections *not* present in the zip are left untouched.

## Scheduled backups

**Settings → Data → Scheduled Backups** runs the same export on a timer:

| Setting | Default | Notes |
|---|---|---|
| Enabled | off | |
| Interval | every 24 hours | |
| Retention | keep 7 | Older zips are pruned automatically |

Zips are written to a `backups/` directory next to the backend's storage
directory (`STORAGE_DIR/../backups`) — in Docker, that is inside the
`backend-storage` volume, which is exactly why that volume is worth keeping.

Scheduled backups always target the **real** database, even while
[Demo Mode](/features/demo-mode-and-lock) is on.

You can list and download previous runs from the same panel, or trigger one
immediately with **Run now**.

## Moving to another machine

1. Export on the old machine.
2. Bring up the app on the new one against its own MongoDB
   ([Getting started](/guide/getting-started) or
   [Docker](/guide/docker)).
3. Import the zip.
4. Re-check **Settings → AI Agent** — provider keys travel with the backup, so
   confirm you actually want them on the new host.

## Related API routes

| Route | Purpose |
|---|---|
| `GET /settings/db/export` | Download a zip of every collection |
| `POST /settings/db/import` | Restore from a zip (raw body) |
| `GET /settings/backups` | List scheduled backup files |
| `GET /settings/backups/:file` | Download one |
| `POST /settings/scheduled-backup/run` | Run a scheduled backup now |

Full list in the [REST API reference](/reference/rest-api).
