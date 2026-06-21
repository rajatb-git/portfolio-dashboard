# Design System

Visual language for the Portfolio Dashboard. All values come from `packages/frontend/src/components/ThemeRegistry/palette.ts` and are applied via MUI's theme — prefer theme tokens over hardcoded values.

## Modes

Dark is the default. Both modes are fully supported; the toggle lives in Settings → Appearance.

| Token | Light | Dark |
|---|---|---|
| `background.default` | `#f8fafc` | `#060c18` |
| `background.paper` | `#ffffff` | `#0d1929` |
| `text.primary` | `#212B36` | `#e2e8f0` |
| `text.secondary` | `#637381` | `#94a3b8` |
| `text.disabled` | `#919EAB` | `#475569` |
| `divider` | `rgba(0,0,0,0.12)` | `rgba(255,255,255,0.07)` |

## Palette

```
Primary   (blue)     main #3b82f6    dark #1d4ed8    light #93c5fd
Secondary (purple)   main #8E33FF    dark #5119B7    light #C684FF
Info      (cyan)     main #00B8D9    dark #006C9C    light #61F3F3
Success   (green)    main #36B37E    dark #1B806A    light #86E8AB
Warning   (amber)    main #FFAB00    dark #B76E00    light #FFD666
Error     (red)      main #FF5630    dark #B71D18    light #FFAC82
```

### Brand gradient

The app's primary brand mark uses a blue→indigo diagonal:

```css
background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
box-shadow: 0 0 14px rgba(59,130,246,0.3);
```

Used on the sidebar logo tile (30×30, 8px radius) and the favicon (32×32 SVG). If the gradient changes, both must change together.

### Sentiment colors

These are domain-specific and do not follow MUI's semantic tokens; use them exactly for bullish/bearish/neutral indicators.

| Sentiment | Foreground | Background (12% alpha) | Border (25% alpha) |
|---|---|---|---|
| Bullish | `#22c55e` | `rgba(34,197,94,0.12)` | `rgba(34,197,94,0.25)` |
| Bearish | `#ef4444` | `rgba(239,68,68,0.12)` | `rgba(239,68,68,0.25)` |
| Neutral | `#f59e0b` | `rgba(245,158,11,0.12)` | `rgba(245,158,11,0.25)` |

For price change chips, `#4ade80` (up) and `#f87171` (down) are used on the hero header in Research. Accent `#8b5cf6` marks AI insights.

## Typography

MUI defaults with two size conventions:

| Role | Size | Weight |
|---|---|---|
| Page title | MUI `h6` | 700 |
| Section label (uppercase) | `0.72rem` | 700, letter-spacing `0.06em` |
| Body / table cell | `0.82rem` | 400–500 |
| Secondary / helper | `0.78rem` | 400 |
| Caption / metadata | `0.72rem` or `0.65rem` | 400 |
| Micro labels (uppercase stat headers) | `0.65rem`, letter-spacing `0.05em` | 600 |

Prices and "hero" numbers are `1.75rem / 700`. Tiny chip labels go as small as `0.62rem`.

## Spacing

MUI's 8px base. Common values:

- Card internal padding: `p: 2` (16px) or `p: 2.5` (20px)
- Section row: `px: 2, py: 1.5`
- Stack spacing between cards: `spacing={2}`
- Stack spacing within a card: `spacing={1}` / `spacing={1.5}`

## Shape

- Cards, buttons: MUI default (4–8px)
- Logo tile, brand squares: `8px`
- Chips: `6px`
- Inputs: `4px` (via the styled `TextField` / `Select` in `BuySellDialog.tsx`)
- Drawer and elevated surfaces: inherit MUI defaults

## Elevation & borders

Heavy elevation is avoided. Most surfaces use `elevation={0}` with a 1px divider border. The sidebar and app bar use a subtle `backdrop-filter: blur(16px)` over a semi-transparent background.

## Icons

- All icons via `Iconify` (wrapping `@iconify/react`). Prefer:
  - `eva:` for navigation and generic UI
  - `tabler:` for quick outline icons
  - `mdi:` for domain icons (alerts, lightbulb, rocket)
  - `fluent:brain-sparkle-20-filled` for AI
  - `mingcute:refresh-3-fill` for refresh buttons
- Size in `width` prop — common sizes: `11`, `14`, `16`, `18`, `20`, `32`.

## Brand marks

**Sidebar logo** (`components/Nav/Drawer.tsx::LogoIcon`): 30×30 rounded square, brand gradient, white trend-line SVG on top, subtle 14px glow.

**Favicon** (`public/favicon.svg`): same visual at 32×32 in an SVG — matches the sidebar tile pixel-for-pixel.

If either changes, update both.

## Loading states

Always `Skeleton` from MUI — never spinners. Match the skeleton's shape and approximate size to what it replaces.

## Charts

- **ApexCharts** for time-series (portfolio performance).
- **MUI X Charts / DataGrid** for tables and pie/donut visualizations.
- Chart axis and grid lines should match the active palette's `divider`/`text.disabled`.
