# Demo mode & app lock

Two small features that make the app safe to show to someone else.

## Demo mode

**Settings → Demo Mode → Show Sample Data** seeds a generated portfolio —
accounts, holdings, transactions, alerts and value snapshots — so you can click
through every screen with realistic numbers.

::: info Your real data is never touched
Demo mode switches the backend to a **separate database**,
`<MONGO_DB_NAME>_demo`, on the same MongoDB server. It is not a different
`MONGO_URI`, and it is not a mask over your real collections — it is a different
database that the real one cannot be reached from while demo mode is on.
:::

- **Reset Demo Data** regenerates the sample dataset from scratch.
- Turning demo mode off switches straight back to your real database.
- [Scheduled backups](/guide/backups) always target the **real** database, even
  while demo mode is on — so a demo session cannot poison your backups.

Good for: screenshots, a walkthrough for someone else, or trying a feature
before you trust it with real numbers.

## App lock

**Settings → Security** adds an optional passcode to the app. This is *not*
multi-user authentication — it is a screen lock for a dashboard you leave open.

| Setting | Notes |
|---|---|
| Enable lock | Off by default |
| Passcode | Stored **salted and hashed**, never in plaintext |
| Auto-lock after | Idle timeout in minutes (default 15) |

### How it works

Unlocking calls `POST /auth/unlock`, which returns a signed HMAC-SHA256 session
token whose lifetime matches your idle timeout. Every subsequent API request
carries it as a `Bearer` token, and the backend verifies the signature in
constant time. `POST /auth/lock` ends the session.

While the lock is enabled, the API rejects unauthenticated requests with `401` —
so the lock covers the data, not just the UI. Three paths stay open by design:
`/health`, `/auth/*`, and `GET /settings/lock` (the UI needs to know whether to
show the lock screen).

### Brute-force protection

Failed unlock attempts are rate-limited per IP: **5 attempts per minute**, then
a **5-minute lockout** with `429` responses.

### If you forget the passcode

The lock lives in the `lock_config` collection. Delete it and restart the
backend:

```js
db.lock_config.deleteMany({})
```

::: warning Not an internet-facing security boundary
A passcode lock and a single shared session token are appropriate for a LAN
dashboard. If you expose the app beyond your network, put a proper
authenticating reverse proxy in front of it.
:::
