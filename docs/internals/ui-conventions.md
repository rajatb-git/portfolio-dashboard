# UI Conventions

Interaction and layout patterns used throughout the app. New UI should match these.

## Forms and settings

### Explicit Save buttons (required)

**Any form input — text field, select, dropdown — persists through an explicit Save button. No onBlur auto-save. No save-on-change.**

Why: onBlur saves fire network calls the user didn't consciously trigger, making failures confusing ("why did a toast just pop up?"), offering no "undo," and making it easy to leave the UI in an inconsistent half-edited state.

Pattern:

```tsx
const [saved, setSaved] = useState<X | null>(null);       // last persisted
const [draft, setDraft] = useState<X | null>(null);       // current edits
const isDirty = !!saved && !!draft
  && JSON.stringify(saved) !== JSON.stringify(draft);

// load
useEffect(() => {
  api.getX().then((x) => { setSaved(x); setDraft(x); })
    .catch((err) => toast.error(err.message));
}, []);

// update
const updateDraft = (partial: Partial<X>) =>
  setDraft((d) => d ? { ...d, ...partial } : d);

// save
const handleSave = () => {
  if (!draft || !isDirty) return;
  setSaving(true);
  api.saveX(draft)
    .then((x) => { setSaved(x); setDraft(x); toast.success('Saved'); })
    .catch((err) => toast.error(err.message))
    .finally(() => setSaving(false));
};

// reset
const handleReset = () => setDraft(saved);
```

UI:

- **Save** (primary, `variant="contained"`) — disabled when `!isDirty || saving`
- **Reset** (outlined) — disabled when `!isDirty || saving`
- **"Unsaved changes"** indicator (warning color, small text) when `isDirty`

Exceptions: a standalone boolean master switch with immediate effect (e.g. "Enable dark mode") may save directly, but if the switch sits inside a form alongside other inputs, route it through the same `draft` state.

Canonical implementation: `pages/Settings.tsx`, both the **AI Agent** section and the **Backend URL** row.

### Dialog forms (Buy/Sell, etc.)

Dialogs that collect input use a **Submit** button on the dialog footer and a **Cancel** button. The `useField` hook manages each input's state, validation, and reset. The dialog is keyed by a stable identifier (symbol, id) so `initialValues` stay fresh when the parent swaps the record.

## Toasts (feedback)

Always `react-toastify`. A single `ToastContainer` lives in `App.tsx`.

```ts
import { toast } from 'react-toastify';

toast.error(err.message || 'Failed to load X');
toast.success('X saved');
```

- **Error** — every caught exception that the user could plausibly have caused or want to retry.
- **Success** — user-visible success after an action that isn't obvious from a UI change (e.g. Save, Export, Import). Skip it when the UI result already communicates success (e.g. a table row updates).
- **Info / Warning** — rare. Avoid.

Never silently swallow errors. A silent `.catch(() => {})` is almost always a bug — at minimum, toast or set an error state.

## Loading states

- MUI `Skeleton` — not spinners. Shape the skeleton to approximate the real content (width/height/rounding).
- Set an `isLoading` boolean per independent fetch; render skeletons inside the component that owns that data.

Example:

```tsx
{isLoading ? (
  <Stack spacing={1.5} sx={{ p: 2 }}>
    <Skeleton variant="rounded" height={16} width="30%" />
    <Skeleton variant="rounded" height={48} />
  </Stack>
) : error ? (
  <ErrorState message={error} />
) : !data ? (
  <EmptyState />
) : (
  <Content data={data} />
)}
```

## Empty / error / not-configured states

These are **four different situations and each needs its own UI**:

| State | When | UI |
|---|---|---|
| Loading | request in flight | Skeleton |
| Error | request failed | Red alert icon + error message + toast |
| Not configured | feature disabled / prerequisite missing | Muted info icon + setup hint |
| Empty | request succeeded but no data | Muted icon + "No data yet" text |

`components/ui/StateView.tsx` renders all four — pass `state` and, for error and not-configured, a `message`:

```tsx
<StateView state="error" message={err} action={{ label: 'Retry', onClick: load }} />
<StateView state="empty" icon="tabler:wallet-off" title="No holdings yet" message="…" />
```

Do not collapse an error into the "not configured" state. A user who sees "configure your AI provider" when the real problem is a network timeout will waste time fighting the wrong problem. See `components/Research/AgentInsightsCard.tsx` for the split.

## The primitive library (`components/ui/`)

Build with these before writing a new card, header, or figure from scratch.

| Primitive | Use for |
|---|---|
| `PageHeader` | The page's `h1`, subtitle, page-level actions, and an optional filter/tab row |
| `Panel` | Any card-shaped surface: header (eyebrow/title/icon/actions), body, footer |
| `StatTile` | A KPI: label, value, optional delta, sparkline, hint, footer |
| `Delta` | **Any** gain/loss figure — colour, sign and direction glyph together |
| `Metric` | A plain label/value pair inside dense detail lists |
| `Sparkline` | Axis-free trend shape beside a figure |
| `StateView` | The four states above; `BlockSkeleton` for the loading case |
| `ToolbarButton` | Icon-only action with a mandatory accessible name |
| `useSentiment` | Mode-correct gain/loss colours for custom layouts |

Every page has **exactly one** `PageHeader`, and it is the page's only `h1`.

## Cards and sections

- Prefer `Panel`. Reach for a bare `Card` only when `Panel`'s header does not fit.
- Cards use `elevation={0}` with a divider border — the theme applies this by default.
- Section headers inside a card: use Panel's `eyebrow`, or the `SettingsSection` pattern in `pages/Settings.tsx`.
- Rows inside a section: `SettingRow` — label + optional description on the left, controls on the right.

## Tables

- MUI X `DataGrid` for editable/CRUD tables (accounts, holdings, transactions).
- Plain MUI `Table` for read-mostly dashboards (`DashboardTable`).
- Row click routes to the Research page when a ticker is involved: `navigate('/research?searchText=SYMBOL')`.
- Inline actions live in an action column (edit / delete / trade icons) — do not hide them behind row hover only.
- Anything holding a figure takes `data-numeric=""` so digits align.
- A wide table scrolls inside its own `overflowX: 'auto'` container. **The page body must never scroll horizontally.** Render empty and error states as a *sibling* of the table, not as a `colSpan` row — a cell inherits the table's `minWidth` and slides off-screen on a phone.

## Navigation

- Sidebar is always visible on desktop and collapses to an icon strip; on mobile it is a temporary overlay. Respect `DRAWER_WIDTH` / `DRAWER_COLLAPSED_WIDTH` in `config.ts`.
- Add a new route to `NAV_CONFIG` with a `section` and a one-line `description` (the description is the collapsed-state tooltip).
- The top bar holds global search (`⌘K`), market status and the theme toggle. It repeats the page title on mobile only — on desktop the page's own `h1` does that job.
- Page content goes inside the main layout; don't introduce a second header bar.

## Accessibility

Non-negotiable, and cheap if done while writing the component:

- **Never signal with colour alone.** Pair it with a glyph or text — `Delta` handles this for gain/loss.
- Every icon-only control needs an accessible name. `ToolbarButton` requires `label`; a bare `IconButton` needs `aria-label`.
- Icons are decorative: `aria-hidden` when adjacent text names the thing, `role="img"` + `aria-label` when the icon carries the meaning alone.
- Interactive elements must be real `button`/`a` elements so they are focusable and keyboard-operable. A clickable `Box` is a bug.
- Toggles that expand something carry `aria-expanded` (plus `aria-controls` where a target id exists).
- Tabs need `role="tabpanel"`, `id` and `aria-labelledby` wiring — see `pages/Analytics.tsx`.
- Do not remove the focus ring. It is `:focus-visible`-scoped already, so it never fires on mouse click.
- Check new colours against the surface they sit on. AA (4.5:1) for text, 3:1 for UI chrome.

## Currency and dates

- Currency: `fnCurrency(value)` from `utils/formatNumber.ts`. Never raw `toFixed(2)` with a dollar sign.
- Dates in UI: `moment(x).format('MMM D, h:mm a')` or `moment(x).fromNow()` for relative times.
- Dates in storage: ISO strings.

## Refreshing data

- Provide an explicit refresh control on pages/cards that fetch live data:
  `<ToolbarButton icon="tabler:refresh" label="Refresh …" onClick={load} busy={isLoading} color="primary.main" />`
- The `label` is both the tooltip and the accessible name — make it specific ("Refresh holdings and prices", not "Refresh").
- `busy` swaps the icon for a small spinner. This is the one sanctioned spinner in the app: a skeleton would be wrong for a control that stays in place.
- Refresh re-runs the same fetch the page ran on mount.

## Do not

- Add custom CSS files beyond `global.css`. Use `sx` or the theme's `components` overrides.
- Write a raw hex in a component. Use a theme token, a `tokens.ts` export, or a `var(--pd-*)` sentiment variable.
- Use green or red for anything that is not gain/loss. Categorical series come from `SERIES`.
- Add a spinner in place of a loading state. Use `Skeleton` / `StateView`.
- Auto-save text or dropdown inputs.
- Use native `alert` / `confirm` — use a MUI `Dialog`.
- Introduce a new icon library. Everything goes through Iconify.
- Re-introduce motion that bypasses `prefers-reduced-motion`.
