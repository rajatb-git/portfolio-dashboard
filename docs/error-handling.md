# Error Handling

A single end-to-end contract that every request in the app follows. Deviations are bugs.

## The contract

1. **External call fails** → backend external-API adapter logs it and rethrows.
2. **Controller** rethrows (or translates) the error; no silent fallbacks that hide failure from the caller.
3. **Router** catches, logs once with context, responds with:
   - `ctx.status = 400` (client-caused) or `500` (server-caused)
   - `ctx.body = errorBody(name, message)` — an object, never a raw string
4. **Frontend API client** chains `.catch(catchCustomError)`, which rehydrates a real `Error` (with `name` and `message` from the response body) and rethrows.
5. **UI call site** catches, shows `toast.error(err.message)`, and puts the UI into an explicit error state.

The shape is `{ name: string; message: string }` from top to bottom.

## Backend

### Logger

```ts
import { logger } from '../utils/winston';

logger.log({
  level: 'error',
  label: 'Short context, e.g. Get live quote "AAPL"',
  message: err.message,
});
```

- `label` groups related errors for log filtering.
- `message` is the human-readable error.
- Add `stack`/`name` for unexpected failures.

### errorBody helper

```ts
// packages/backend/src/utils/error.ts
export const errorBody = (name: string, message: string) => ({ name, message });
```

Always use it in responses. `name` should be a short failure category ("Failed to get holdings"); `message` is the cause. The frontend's `catchCustomError` will pull both out and attach them to the rethrown `Error`.

### Route template

```ts
router.get('/things/:id', async (ctx) => {
  try {
    const result = await getThing(ctx.params.id);
    ctx.body = result;
    ctx.status = 200;
  } catch (err: any) {
    logger.log({ level: 'error', label: `Get thing "${ctx.params.id}"`, message: err.message });
    ctx.body = errorBody('Failed to get thing', err.message);
    ctx.status = 400;
  }
});
```

Rules:

- **Every** route handler has a try/catch. No exceptions, not even for trivial reads.
- **Every** response body on error is `errorBody(...)`. No raw `err.message` strings.
- For file-path params (e.g. `/logs/:file`), validate against an allowlist before touching the filesystem.
- For "best-effort" operations that must not break the main response (e.g. writing a daily snapshot), it's acceptable to swallow the error — but log it with a clear label so it's visible in operations.

### External API adapters (`externalApis/`)

All adapters follow log-and-rethrow:

```ts
.catch((error: AxiosError) => {
  logger.log({
    level: 'error',
    label: error.status,
    message: error.message,
  });
  throw error;
});
```

This keeps the router in control of user-facing error translation while making sure the raw external failure is always logged with its HTTP status.

### Controllers

Controllers call external adapters and/or models. They rethrow. They do **not**:

- Return `null` on error without logging.
- Fall back to defaults that mask failure. Example: if a sector lookup fails, don't silently bucket the holding under "Unknown" — either propagate or log the swap loud enough to notice.

When a controller fans out parallel work (e.g. live quotes for many symbols), it may catch individual failures and drop those rows from the result, but it must log each drop with the symbol and reason. Never transparently remove data from a response.

## Frontend

### catchCustomError

```ts
// packages/frontend/src/api/apiUtil.ts
export const catchCustomError = (error: AxiosError<{ name: string; message: string }>) => {
  const customError = new Error(error.response?.data?.message || error.message);
  customError.name = error.response?.data?.name || error.name;
  throw customError;
};
```

Every method in every `api/*.ts` client ends with `.catch(catchCustomError)`. This is the sole reason the UI can trust `err.message` to be a useful, backend-authored string.

### API client template

```ts
export class ThingsAPI {
  getAll = async (): Promise<Array<Thing>> =>
    axios
      .get(DB_HOST + '/things')
      .then((r) => r.data)
      .catch(catchCustomError);
}
```

Forbidden patterns:

```ts
// BAD — swallows the error, returns it as data
.catch((error) => error)

// BAD — silent failure
.catch(() => null)

// BAD — missing catch entirely
axios.get(url).then((r) => r.data);
```

### UI call site template

```tsx
setIsLoading(true);
setError(null);
apis.things.getAll()
  .then(setThings)
  .catch((err) => {
    setError(err.message || 'Failed to load things');
    toast.error(err.message || 'Failed to load things');
  })
  .finally(() => setIsLoading(false));
```

For user-triggered actions (button clicks, form submits):

```tsx
const handleSave = async () => {
  try {
    await apis.things.save(draft);
    toast.success('Saved');
  } catch (err: any) {
    toast.error(err.message || 'Save failed');
  }
};
```

### Separate "error" from "empty" from "not configured"

Same rule from `ui-conventions.md` — if a component has different UIs for these states, thread an `error` prop through rather than collapsing them. See `components/Research/AgentInsightsCard.tsx` for the pattern.

### Toasts

A network failure the user cares about → `toast.error(err.message)`. A save succeeded → `toast.success('...')`. That's it. No "Loading..." toasts, no repeated toasts for the same failing request.

## What counts as "silent" (anti-patterns)

| Pattern | Why it's wrong |
|---|---|
| `.catch(() => {})` | User sees nothing; impossible to debug. |
| `.catch(() => setThing(null))` | Looks identical to "no data yet" — user chases the wrong problem. |
| `.catch(() => [])` with no toast | Empty table that lies about why. |
| `.catch((err) => err)` | Returns an `Error` object *as* the data. Worst of all. |
| Returning raw `err.message` strings from backend routes | `catchCustomError` can't read the structured name/message. |
| Logging on backend but returning 200 with partial data | Frontend has no way to know something failed. |

## Checklist before you merge

- [ ] Every new backend route: try/catch + `logger` + `errorBody` + status code.
- [ ] Every new frontend API method: `.catch(catchCustomError)`.
- [ ] Every new `.catch` in a component: renders an error UI AND fires `toast.error`.
- [ ] No `.catch(() => ...)` with no error surfacing anywhere in the diff.
- [ ] Distinguishes error / empty / not-configured in UI if those states are all reachable.
