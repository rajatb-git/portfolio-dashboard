# Troubleshooting

Start here when something is not working. Two things are worth checking before
anything else:

```sh
curl http://localhost:3001/health     # is the backend up?
```

and the **Logs** page in the sidebar, which reads the backend's `combined.log`
and `error.log` (newest entries first). In Docker, `docker compose logs -f backend`
shows the same output.

## The backend will not start

**Symptom:** the process exits, or every request from the UI fails immediately.

The backend requires a reachable MongoDB — it has no fallback store. Check, in
order:

1. `MONGO_URI` is set in `packages/backend/.env` (or passed into the container).
2. The credentials are right and the user can write to `MONGO_DB_NAME`.
3. **In Docker:** the URI is *not* `localhost`. Inside the container that is the
   container itself. Use the Mongo host's LAN address.
4. Nothing is blocking port 27017 between the two hosts.

## Prices are missing or the dashboard is empty

**Symptom:** holdings are listed but current price, day change and P&L are
blank, or rows disappear.

- **Check the Finnhub key.** `FINN_HUB_API_KEY` must be set and valid.
  `error.log` shows the rejection from Finnhub verbatim.
- **Check the rate limit.** The free tier allows a burst per second *and* a
  sustained per-minute cap. With many holdings, a full dashboard refresh can hit
  it. The defaults (`FINN_HUB_BURST_LIMIT=30`, `FINN_HUB_RATE_LIMIT=60`) match
  the free tier — raise them only if you are on a paid plan.
- Holdings whose live fetch fails are **skipped** rather than failing the whole
  response, which is why a partial dashboard usually means partial rate-limiting.
- Crypto symbols must be entered the way Finnhub expects them; a symbol it does
  not recognise returns no quote.

## The frontend cannot reach the backend

**Symptom:** every page shows an error toast; the browser console shows failed
requests to the wrong host.

The frontend resolves the API URL as: `localStorage.api_host` →
`VITE_DB_HOST` → `http://localhost:3001`. Fix it under **Settings →
Application → Backend URL** — that value wins over the build-time one.

In Docker the frontend is built with `VITE_DB_HOST=/api` and nginx proxies
`/api/` to the backend service. If you changed the service name or port in
`docker-compose.yml`, update `packages/frontend/nginx.conf` to match.

## AI insights fail

| Message | What it means |
|---|---|
| *AI agent is not enabled* | Turn it on under **Settings → AI Agent** |
| *Ollama is selected but not configured* | Set the Ollama host (default `http://localhost:11434`) |
| *…only runs on a local Ollama provider* | You asked for a feature that sees personal data (portfolio insights, document import). Switch the provider to Ollama — this is [by design](/internals/ai-privacy) |
| *did not return valid JSON* | The local model ignored the JSON schema. Try a larger or more instruction-following model |
| A 504 from nginx | The first Ollama request loads the model and can take minutes. The bundled nginx config already allows 180s; if you front the app with your own proxy, raise its read timeout too |

If the backend runs in a container and Ollama runs on the host, the Ollama host
cannot be `localhost` either — use the host's LAN address, and make sure Ollama
is listening on more than the loopback interface.

## Notifications never arrive

1. **Settings → Alert Notifications** — is MQTT enabled, and is the broker URL
   reachable from the *backend* (`mqtt://host:1883`)?
2. `combined.log` logs every connect, publish and drop. A *"Dropped message —
   MQTT client not connected/configured"* line means the broker is unreachable.
3. Is the individual service enabled? Each one (price alerts, move alerts, news,
   earnings, dividends, IPO, daily summary) has its own switch and its own topic.
4. **Quiet Hours** may be holding messages. In *digest* mode they are queued and
   released later; in *suppress* mode they are dropped.
5. Some services only fire while the market is open unless you explicitly enable
   crypto-24/7 or after-hours coverage — see
   [Background services](/reference/background-services).

## I locked myself out

The passcode lock is stored in MongoDB (`lock_config`). If you lose the code,
remove that document from your database and restart the backend:

```js
db.lock_config.deleteMany({})
```

## Demo Mode showed up with data I did not enter

That is what it is for — it seeds a generated portfolio into a **separate**
database (`<MONGO_DB_NAME>_demo`). Turn it off in **Settings → Demo Mode** and
your real data is exactly where you left it.

## Something else

Open an issue with the relevant lines from `error.log` (redact your keys) at
[github.com/rajatb-git/portfolio-dashboard/issues](https://github.com/rajatb-git/portfolio-dashboard/issues).
