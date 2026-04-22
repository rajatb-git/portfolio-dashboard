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

These are **three different states and need three different UIs**:

| State | When | UI |
|---|---|---|
| Loading | request in flight | Skeleton |
| Error | request failed | Red alert icon + error message + toast |
| Not configured | feature disabled / prerequisite missing | Muted info icon + setup hint |
| Empty | request succeeded but no data | Muted icon + "No data yet" text |

Do not collapse an error into the "not configured" state. A user who sees "configure your AI provider" when the real problem is a network timeout will waste time fighting the wrong problem. See `components/Research/AgentInsightsCard.tsx` for the split.

## Cards and sections

- Cards use `variant="outlined"` or `elevation={0}` with a divider border.
- Section headers inside a card: uppercase, `0.72rem`, weight 700, letter-spacing `0.06em`, padded `10px 16px`, followed by a `Divider`. Use the `SettingsSection` pattern (`pages/Settings.tsx`).
- Rows inside a section: `SettingRow` — label + optional description on the left, controls on the right, `borderBottom: 1px solid divider`.

## Tables

- MUI X `DataGrid` for editable/CRUD tables (accounts, holdings, transactions).
- Plain MUI `Table` for read-mostly dashboards (`DashboardTable`).
- Row click routes to the Research page when a ticker is involved: `navigate('/research?searchText=SYMBOL')`.
- Inline actions live in an action column (edit / delete / trade icons) — do not hide them behind row hover only.

## Navigation

- Sidebar is always visible; it can be collapsed to an icon strip. Respect the `DRAWER_WIDTH` / `DRAWER_COLLAPSED_WIDTH` constants in `config.ts`.
- Top app bar holds a global search (`⌘K`). Keep it and the sidebar consistent across pages.
- Page content goes inside the main layout; don't introduce a second header bar.

## Currency and dates

- Currency: `fnCurrency(value)` from `utils/formatNumber.ts`. Never raw `toFixed(2)` with a dollar sign.
- Dates in UI: `moment(x).format('MMM D, h:mm a')` or `moment(x).fromNow()` for relative times.
- Dates in storage: ISO strings.

## Refreshing data

- Provide an explicit refresh `IconButton` (icon: `mingcute:refresh-3-fill`) on pages/cards that fetch live data.
- `IconButton` color `primary.main`, size small.
- Refresh should re-run the same fetch the page ran on mount.

## Do not

- Add custom CSS files beyond `global.css`. Use `sx` or the theme's `components` overrides.
- Hardcode colors when a theme token exists — except the brand gradient and sentiment colors, which are defined values.
- Add a spinner. Use Skeleton.
- Auto-save text or dropdown inputs.
- Use native `alert` / `confirm` — use a MUI `Dialog`.
- Introduce a new icon library. Everything goes through Iconify.
