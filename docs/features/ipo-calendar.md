# IPO calendar

Upcoming listings, pulled from Finnhub and refreshed on a cache-gated schedule.

## The calendar

The **IPO Calendar** page lists upcoming IPOs with their symbol, company name,
expected date, exchange, price range, share count and total offering value.
Clicking through opens a detail view for a single listing.

## Watching an IPO

Add a listing to your **watchlist** and the app will remind you before it
prices — by default 1 day ahead, via
[the same MQTT transport](/features/alerts) as everything else. IPO reminders
are enabled by default; the reminder window is configurable under
**Settings → IPO Reminders**.

Separately, **IPO announcements** notify you when a *new* listing shows up on
the calendar, so a name worth watching does not slip past between visits.

| Route | Purpose |
|---|---|
| `GET /live/ipos` | The calendar |
| `PUT /live/ipos/:symbol/watch` | Add to watchlist |
| `DELETE /live/ipos/:symbol/watch` | Remove |

## AI insights on a listing

If AI is enabled, the detail view can generate an insight for the offering
(`POST /live/ipo-insights`). Like ticker research, this sends **only public
information about the offering** — the same fields shown on the page — and never
anything about your portfolio, so it works with any configured provider. See
[the AI data-privacy rule](/internals/ai-privacy).

## Related

- [Alerts & notifications](/features/alerts) — where the reminders go
- [REST API](/reference/rest-api#live-market-data)
