# Design System

Visual language for the Portfolio Dashboard.

Every value lives in `packages/frontend/src/components/ThemeRegistry/tokens.ts` and reaches components through the MUI theme. **Import from `tokens.ts` or read `theme.palette.*` — do not write a raw hex in a component.**

The system is a *data-dense financial dashboard*: deep near-black surfaces, one trust-blue accent, and semantic green/red reserved exclusively for gain and loss. Decorative colour is deliberately absent — in a portfolio app, every colour the user sees should carry a number's meaning.

## Files

| File | Holds |
|---|---|
| `tokens.ts` | Every raw value: surfaces, text, sentiment, series, type scale, radii, motion, density |
| `palette.ts` | Maps tokens onto MUI's palette shape |
| `typography.ts` | The type scale |
| `overrides.ts` | Per-component MUI restyling, CSS variables, reduced-motion, focus rings |
| `ThemeRegistry.tsx` | Mode + density state, theme construction |

## Modes

Dark is the default (`system` resolves via `prefers-color-scheme`). Both modes are first-class. The toggle lives in the top bar and in Settings → Appearance.

The dark ramp is navy-black rather than neutral grey: it reads as "financial" and stops the blue accent from looking like it is floating on charcoal. Light mode never uses a pure-white canvas — full white under dense tabular data is fatiguing and flattens the card/canvas separation.

| Token | Light | Dark |
|---|---|---|
| `background.default` (canvas) | `#f1f4f9` | `#05080f` |
| `background.paper` | `#ffffff` | `#0b111d` |
| `background.neutral` (sunken) | `#e8edf5` | `#080c15` |
| `text.primary` | `#0f1b2d` | `#e8eef7` |
| `text.secondary` | `#4a5a70` | `#93a3b8` |
| `text.disabled` | `#7d8b9e` | `#5a6b82` |
| `divider` | `rgba(15,23,42,0.10)` | `rgba(148,163,184,0.14)` |

## Palette

```
Primary   (trust blue)  main #3b82f6   dark #1d4ed8   light #93c5fd
Secondary (indigo)      main #6366f1   dark #4338ca   light #a5b4fc
Info      (cyan)        main #06b6d4   dark #0e7490   light #67e8f9
Success   (green)       main #22c55e   dark #15803d   light #86efac
Warning   (gold)        main #f0b429   dark #b45309   light #fcd34d
Error     (red)         main #ef4444   dark #b91c1c   light #fca5a5
```

`primary.main` clears 3:1 on both canvases — fine for icons, borders and UI chrome, but **not** for body text on light. Use `primary.dark` when a blue accent has to carry a small label in light mode (see `SideNavItem`).

### Brand gradient

```css
background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
box-shadow: 0 0 14px rgba(59,130,246,0.3);
```

Exposed as `BRAND.gradient` / `BRAND.glow`. Rendered by `components/Nav/BrandMark.tsx` and mirrored pixel-for-pixel by `public/favicon.svg`. **If one changes, the other must change with it.**

### Sentiment — gain and loss

Gain/loss is the most-read signal in the app, so it gets its own scale, tuned per mode for contrast rather than reusing `success` / `error`.

| Sentiment | Dark | Light | Contrast on paper |
|---|---|---|---|
| Up | `#34d399` | `#0f7a4a` | 9.8:1 / 5.4:1 |
| Down | `#f87171` | `#c81e1e` | 6.8:1 / 5.7:1 |
| Flat | `#94a3b8` | `#5a6b82` | 7.4:1 / 5.4:1 |

Reach them three ways:

1. **`<Delta />`** — the preferred path. Renders the value, sign, direction glyph and colour together.
2. **`useSentiment(value)`** — returns `{ main, dim, bg, border, glyph, sentiment }` for custom layouts.
3. **CSS variables** — `var(--pd-up)`, `var(--pd-down)`, `var(--pd-flat)`, plus `-bg` / `-border` variants, and `var(--pd-warn)` / `var(--pd-ai)`. Defined per mode in `overrides.ts`. Use these inside an `sx` block that has no access to a `useTheme()` call.

**Colour is never the only signal.** Every sentiment surface pairs its colour with a direction glyph (`tabler:trending-up` / `-down` / `tabler:minus`), so the value survives greyscale and red/green colour deficiency. `<Delta />` does this for you.

### Series colours

`SERIES` is the categorical ramp for charts (allocation, sectors, benchmarks). It leads with blue, gold, cyan and violet and pushes green far down the list **on purpose**: green and red already mean gain and loss, so a sector rendered in red would read as a loss.

## Typography

A system font stack — professional, zero network cost, available offline for the PWA. The typeface matters less here than **tabular numerals**: misaligned digits in a holdings table are a real legibility bug. `font-feature-settings: 'tnum'` is set on `body`, and anything carrying a figure should also take `data-numeric=""`, which forces `tabular-nums lining-nums`.

Headings stay small on purpose. On a dashboard the data is the headline; a page title competing with a portfolio total is a hierarchy bug.

| Role | Token | Size | Weight |
|---|---|---|---|
| Hero figure (portfolio total) | `FONT_SIZE.hero` | 36px | 700 |
| Display figure (stat tile, price) | `FONT_SIZE.display` | 28px | 700 |
| Page title (`h1`) | `FONT_SIZE.xl` | 18px | 680 |
| Card title | `FONT_SIZE.lg` / `md` | 16 / 14px | 650 |
| Body, table cell | `FONT_SIZE.sm` | 13px | 450–600 |
| Caption, metadata | `FONT_SIZE.xs` | 12px | 450 |
| Uppercase eyebrow, chip | `FONT_SIZE.micro` | 11px | 700, `0.07em` |

11px is the floor, and only for uppercase labels with letter-spacing. Never put prose below 12px.

## Spacing, shape, elevation

MUI's 8px base is unchanged; dense layouts step in half-units (`0.5` = 4px).

- Card padding: `p: 2` (16px), or `p: 1.5` when `dense`
- Panel header: `px: 2, py: 1.25`
- Stack between cards: `spacing={2}`; within a card: `spacing={1}`–`{1.5}`

Radii come from `RADIUS`: `xs 4 · sm 6 · md 8 · lg 12 · xl 16 · pill 999`. Cards are `lg`, dialogs `xl`, chips `sm`, buttons/inputs `md`.

Elevation is deliberately flat. Surfaces separate by **border and background**, not stacked shadow — layered shadows make dense layouts look muddy. Cards ship `elevation={0}` with a 1px divider border and a hairline shadow. The `SHADOW` ramp exists for dialogs, menus and tooltips.

## Density

`DENSITY` offers `comfortable` (44px rows) and `compact` (34px rows). The user picks it in Settings → Appearance; it is stored under `ui_density` and feeds `overrides()`, driving table row padding and card padding. New components that own row-like content should read `DENSITY[density]` rather than hardcoding a height.

## Motion

`MOTION` tokens: `instant 80ms · fast 140ms · normal 200ms · slow 320ms`, easing `cubic-bezier(0.4, 0, 0.2, 1)`.

Nothing in a financial dashboard should feel like it is performing for the user. Hovers and colour shifts are `fast`; layout changes are `normal`. There are no entrance animations.

`prefers-reduced-motion: reduce` collapses every animation and transition to 0.01ms globally, via `MuiCssBaseline`. Do not re-introduce motion that bypasses it.

## Focus and touch

Keyboard focus is a 2px `primary.main` outline at 2px offset, applied through `:focus-visible` only — a mouse click that leaves a persistent outline reads as a rendering bug. It is set globally and re-applied per component where MUI would otherwise strip it.

Icon buttons get a 44×44 minimum hit area under `@media (pointer: coarse)`, so desktop density is unaffected.

## Icons

All icons via the `Iconify` wrapper. **`tabler:` is the house set** — prefer it for anything new. `eva:` and `mdi:` survive in older components.

Icons are decorative by default: pass `aria-hidden` when adjacent text already names the thing, or `role="img"` + `aria-label` when the icon is the only carrier of meaning. `Iconify`'s props accept both.

Sizes: `11 · 13 · 15 · 16 · 18 · 20 · 22`.

## Charts

- **ApexCharts** for time series (portfolio performance).
- **MUI X Charts** for pie/donut and small statistical views; **MUI X DataGrid** for editable tables.

Chart chrome must follow the theme: axis labels take `TEXT[mode].secondary`, grid lines a `rgba` divider, and the Apex tooltip takes `theme: mode`. Series colours come from `SERIES`. Gain/loss encodings — and only those — use the sentiment scale.

## Contrast

Every token pair in this document clears WCAG AA (4.5:1) for text, and no token falls below 3:1 on any surface. `text.disabled` sits at ~3.2:1, which is intentional and applies only to non-essential metadata.

Verify before shipping a new colour — the previous palette shipped `#22c55e` on white at **2.28:1**, which is why the sentiment scale is now mode-aware.
