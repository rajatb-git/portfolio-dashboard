// Design tokens for the Portfolio Dashboard.
//
// The visual system is a "data-dense financial dashboard": deep near-black
// surfaces, one trust-blue accent, and semantic green/red reserved exclusively
// for gain/loss. Decorative colour is deliberately absent — in a portfolio app
// every colour a user sees should carry a number's meaning.

export type Mode = 'light' | 'dark';

// Surfaces
// ---------------------------------------------------------------------------
// Dark is a navy-black ramp rather than neutral grey: it reads as "financial"
// and keeps the blue accent from looking like it is floating on charcoal.

export const SURFACE = {
  dark: {
    canvas: '#05080f',
    sunken: '#080c15',
    paper: '#0b111d',
    raised: '#111a2b',
    overlay: '#16213494',
    hover: 'rgba(255,255,255,0.045)',
    selected: 'rgba(59,130,246,0.14)',
    border: 'rgba(148,163,184,0.14)',
    borderStrong: 'rgba(148,163,184,0.26)',
  },
  light: {
    // Never pure white — a full-white canvas under dense tabular data is
    // fatiguing and flattens the card/canvas separation.
    canvas: '#f1f4f9',
    sunken: '#e8edf5',
    paper: '#ffffff',
    raised: '#ffffff',
    overlay: '#ffffffcc',
    hover: 'rgba(15,23,42,0.04)',
    selected: 'rgba(59,130,246,0.10)',
    border: 'rgba(15,23,42,0.10)',
    borderStrong: 'rgba(15,23,42,0.20)',
  },
} as const;

export const TEXT = {
  dark: {
    primary: '#e8eef7',
    secondary: '#93a3b8',
    disabled: '#5a6b82',
  },
  light: {
    primary: '#0f1b2d',
    secondary: '#4a5a70',
    disabled: '#7d8b9e',
  },
} as const;

// Brand
// ---------------------------------------------------------------------------
// The blue→indigo gradient is the product's identity and is mirrored by
// public/favicon.svg. Changing one requires changing the other.

export const BRAND = {
  gradient: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
  glow: '0 0 14px rgba(59,130,246,0.3)',
  from: '#3b82f6',
  to: '#6366f1',
} as const;

export const PRIMARY = {
  lighter: '#dbeafe',
  light: '#93c5fd',
  main: '#3b82f6',
  dark: '#1d4ed8',
  darker: '#1e3a8a',
  contrastText: '#ffffff',
} as const;

export const SECONDARY = {
  lighter: '#e0e7ff',
  light: '#a5b4fc',
  main: '#6366f1',
  dark: '#4338ca',
  darker: '#312e81',
  contrastText: '#ffffff',
} as const;

export const INFO = {
  lighter: '#cffafe',
  light: '#67e8f9',
  main: '#06b6d4',
  dark: '#0e7490',
  darker: '#164e63',
  contrastText: '#ffffff',
} as const;

export const SUCCESS = {
  lighter: '#dcfce7',
  light: '#86efac',
  main: '#22c55e',
  dark: '#15803d',
  darker: '#14532d',
  contrastText: '#04140a',
} as const;

export const WARNING = {
  lighter: '#fef3c7',
  light: '#fcd34d',
  main: '#f0b429',
  dark: '#b45309',
  darker: '#78350f',
  contrastText: '#1c1206',
} as const;

export const ERROR = {
  lighter: '#fee2e2',
  light: '#fca5a5',
  main: '#ef4444',
  dark: '#b91c1c',
  darker: '#7f1d1d',
  contrastText: '#ffffff',
} as const;

export const GREY = {
  0: '#ffffff',
  100: '#f8fafc',
  200: '#f1f5f9',
  300: '#e2e8f0',
  400: '#cbd5e1',
  500: '#94a3b8',
  600: '#64748b',
  700: '#475569',
  750: '#3b4a5f',
  800: '#1e293b',
  850: '#16213a',
  900: '#0f172a',
} as const;

// Sentiment
// ---------------------------------------------------------------------------
// Gain/loss is the single most-read signal in the app, so it gets its own scale
// that is tuned per mode for contrast rather than reusing success/error tokens.
// Every sentiment surface pairs colour with a direction glyph — colour alone
// fails for the ~8% of users with a red/green deficiency.

export type Sentiment = 'up' | 'down' | 'flat';

export const SENTIMENT = {
  dark: {
    up: { main: '#34d399', dim: '#6ee7b7', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.28)' },
    down: { main: '#f87171', dim: '#fca5a5', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.28)' },
    flat: { main: '#94a3b8', dim: '#cbd5e1', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.24)' },
  },
  light: {
    up: { main: '#0f7a4a', dim: '#116b45', bg: 'rgba(15,122,74,0.10)', border: 'rgba(15,122,74,0.26)' },
    down: { main: '#c81e1e', dim: '#a51616', bg: 'rgba(200,30,30,0.10)', border: 'rgba(200,30,30,0.26)' },
    flat: { main: '#5a6b82', dim: '#475569', bg: 'rgba(90,107,130,0.10)', border: 'rgba(90,107,130,0.22)' },
  },
} as const;

export const SENTIMENT_GLYPH: Record<Sentiment, string> = {
  up: 'tabler:trending-up',
  down: 'tabler:trending-down',
  flat: 'tabler:minus',
};

export function sentimentOf(value: number | null | undefined, epsilon = 0): Sentiment {
  if (value == null || Number.isNaN(value)) return 'flat';
  if (value > epsilon) return 'up';
  if (value < -epsilon) return 'down';
  return 'flat';
}

export function sentimentColors(mode: Mode, sentiment: Sentiment) {
  return SENTIMENT[mode][sentiment];
}

// Categorical series colours for charts — ordered for maximum perceptual
// distance at the first five entries, which covers most allocation views.
export const SERIES = [
  '#3b82f6',
  '#f0b429',
  '#06b6d4',
  '#a78bfa',
  '#f97316',
  '#22c55e',
  '#ec4899',
  '#14b8a6',
  '#8b5cf6',
  '#eab308',
] as const;

// Typography
// ---------------------------------------------------------------------------
// System stack: professional, zero network cost, and available offline for the
// PWA. Tabular numerals matter more than the typeface here — misaligned digits
// in a holdings table are a real legibility bug.

export const FONT_STACK = [
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Inter',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  '"M PLUS Rounded 1c"',
  'sans-serif',
].join(', ');

export const FONT_STACK_MONO = [
  'ui-monospace',
  'SFMono-Regular',
  '"SF Mono"',
  'Menlo',
  'Consolas',
  '"Liberation Mono"',
  'monospace',
].join(', ');

export const TABULAR = "'tnum' 1, 'lnum' 1, 'cv01' 1";

// Type scale — dense end of the ramp, because the app's job is to show many
// numbers at once. 12px is the floor for anything a user must read.
export const FONT_SIZE = {
  micro: '0.6875rem', // 11px — uppercase eyebrows, chip text
  xs: '0.75rem', // 12px — captions, metadata
  sm: '0.8125rem', // 13px — table cells, body
  md: '0.875rem', // 14px — default body
  lg: '1rem', // 16px — card titles
  xl: '1.125rem', // 18px — page titles
  display: '1.75rem', // 28px — hero figures
  hero: '2.25rem', // 36px — portfolio total
} as const;

// Shape, spacing, motion
// ---------------------------------------------------------------------------

export const RADIUS = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

/** MUI spacing base stays at 8px; dense layouts step in half-units (`0.5` = 4px). */
export const SPACING_UNIT = 8;

export const DENSITY = {
  comfortable: { rowHeight: 44, cardPadding: 16, gap: 12 },
  compact: { rowHeight: 34, cardPadding: 12, gap: 8 },
} as const;

export type Density = keyof typeof DENSITY;

export const MOTION = {
  // Fast, functional easing. Nothing in a financial dashboard should feel
  // like it is performing for the user.
  instant: '80ms',
  fast: '140ms',
  normal: '200ms',
  slow: '320ms',
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

export const FOCUS_RING = (color: string) => ({
  outline: `2px solid ${color}`,
  outlineOffset: '2px',
});

export const SHADOW = {
  dark: {
    xs: '0 1px 2px rgba(0,0,0,0.5)',
    sm: '0 2px 6px rgba(0,0,0,0.45)',
    md: '0 6px 18px rgba(0,0,0,0.5)',
    lg: '0 18px 44px rgba(0,0,0,0.6)',
  },
  light: {
    xs: '0 1px 2px rgba(15,23,42,0.06)',
    sm: '0 2px 6px rgba(15,23,42,0.07)',
    md: '0 6px 18px rgba(15,23,42,0.09)',
    lg: '0 18px 44px rgba(15,23,42,0.14)',
  },
} as const;

/** Height of the fixed application top bar, in px. */
export const TOPBAR_HEIGHT = 52;
