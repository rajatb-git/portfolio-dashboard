import { outlinedInputClasses } from '@mui/material/OutlinedInput';
import { alpha, type Theme } from '@mui/material/styles';

import {
  DATA_ACCENT,
  DENSITY,
  type Density,
  FONT_SIZE,
  FONT_STACK_MONO,
  MOTION,
  RADIUS,
  SENTIMENT,
  SHADOW,
  SURFACE,
  TABULAR,
} from './tokens';

export function overrides(theme: Theme, density: Density = 'comfortable') {
  const isLight = theme.palette.mode === 'light';
  const s = SURFACE[isLight ? 'light' : 'dark'];
  const sentiment = SENTIMENT[isLight ? 'light' : 'dark'];
  const accent = DATA_ACCENT[isLight ? 'light' : 'dark'];
  const shadow = SHADOW[isLight ? 'light' : 'dark'];
  const d = DENSITY[density];
  const focusColor = theme.palette.primary.main;

  const focusRing = {
    outline: `2px solid ${focusColor}`,
    outlineOffset: '2px',
    // Keeps the ring visible on top of an adjacent sibling's background.
    zIndex: 1,
  };

  return {
    MuiCssBaseline: {
      styleOverrides: {
        '*': { boxSizing: 'border-box' },
        html: {
          margin: 0,
          padding: 0,
          width: '100%',
          height: '100%',
          WebkitOverflowScrolling: 'touch',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textSizeAdjust: '100%',
          colorScheme: isLight ? 'light' : 'dark',
        },
        body: {
          margin: 0,
          padding: 0,
          width: '100%',
          height: 'auto',
          backgroundColor: theme.palette.background.default,
          fontFeatureSettings: TABULAR,
        },
        '#root': { width: '100%', height: '100%' },

        // Sentiment as CSS variables so any `sx` value — including ones far
        // from a `useTheme()` call — can reference the mode-correct colour.
        // The dark greens/reds fail contrast on a light card; these do not.
        ':root': {
          '--pd-up': sentiment.up.main,
          '--pd-up-bg': sentiment.up.bg,
          '--pd-up-border': sentiment.up.border,
          '--pd-down': sentiment.down.main,
          '--pd-down-bg': sentiment.down.bg,
          '--pd-down-border': sentiment.down.border,
          '--pd-flat': sentiment.flat.main,
          '--pd-flat-bg': sentiment.flat.bg,
          '--pd-warn': isLight ? '#a15c07' : '#fbbf24',
          '--pd-warn-bg': isLight ? 'rgba(161,92,7,0.10)' : 'rgba(251,191,36,0.12)',
          '--pd-accent': accent.main,
          '--pd-accent-bg': accent.bg,
          '--pd-accent-border': accent.border,
          '--pd-ai': isLight ? '#5b3bc4' : '#a78bfa',
          '--pd-ai-bg': isLight ? 'rgba(91,59,196,0.10)' : 'rgba(167,139,250,0.12)',
        },

        // Every figure in the app renders in monospace. Beyond making columns
        // align perfectly, this is what separates a trading tool from a generic
        // dashboard at a glance — the numbers read as instrument output rather
        // than as body copy.
        '[data-numeric]': {
          fontFamily: FONT_STACK_MONO,
          fontVariantNumeric: 'tabular-nums lining-nums',
          fontFeatureSettings: TABULAR,
          letterSpacing: '-0.02em',
          fontWeight: 500,
        },
        '[data-mono]': { fontFamily: FONT_STACK_MONO },

        input: {
          '&[type=number]': {
            MozAppearance: 'textfield',
            '&::-webkit-outer-spin-button': { margin: 0, WebkitAppearance: 'none' },
            '&::-webkit-inner-spin-button': { margin: 0, WebkitAppearance: 'none' },
          },
        },
        img: { maxWidth: '100%', display: 'inline-block', verticalAlign: 'bottom' },

        '::-webkit-scrollbar': { width: 10, height: 10 },
        '::-webkit-scrollbar-track': { background: 'transparent' },
        '::-webkit-scrollbar-thumb': {
          background: isLight ? 'rgba(15,23,42,0.16)' : 'rgba(148,163,184,0.20)',
          borderRadius: RADIUS.pill,
          border: '3px solid transparent',
          backgroundClip: 'content-box',
        },
        '::-webkit-scrollbar-thumb:hover': {
          background: isLight ? 'rgba(15,23,42,0.3)' : 'rgba(148,163,184,0.38)',
          backgroundClip: 'content-box',
        },
        '::selection': {
          background: alpha(theme.palette.primary.main, 0.3),
          color: theme.palette.text.primary,
        },

        // Only ever draw a focus ring for keyboard users; a mouse click that
        // leaves a persistent outline reads as a rendering bug.
        ':focus-visible': focusRing,

        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },

    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: theme.palette.background.paper,
        },
        outlined: { border: `1px solid ${s.border}` },
      },
    },

    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: RADIUS.xl,
          border: `1px solid ${s.border}`,
          backgroundImage: 'none',
          backgroundColor: theme.palette.background.paper,
          // Lighter surface + drop shadow + top catch-light. On a near-black
          // canvas a shadow alone has nothing to darken, so the raised
          // background and the highlight do most of the lifting.
          boxShadow: `${shadow.sm}, ${s.highlight}`,
          overflow: 'hidden',
        },
      },
    },

    MuiCardHeader: {
      defaultProps: {
        titleTypographyProps: { variant: 'h6' },
        subheaderTypographyProps: { variant: 'caption', color: 'text.secondary' },
      },
      styleOverrides: {
        root: { padding: `${d.cardPadding}px ${d.cardPadding}px 0` },
      },
    },

    MuiCardContent: {
      styleOverrides: {
        root: { padding: d.cardPadding, '&:last-child': { paddingBottom: d.cardPadding } },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: RADIUS.md,
          fontWeight: 550,
          transition: `background-color ${MOTION.fast} ${MOTION.easing}, border-color ${MOTION.fast} ${MOTION.easing}, color ${MOTION.fast} ${MOTION.easing}`,
          '&:focus-visible': focusRing,
        },
        sizeSmall: { padding: '4px 10px', minHeight: 30 },
        sizeMedium: { padding: '6px 14px', minHeight: 36 },
        sizeLarge: { padding: '9px 20px', minHeight: 42 },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        outlined: {
          borderColor: s.border,
          '&:hover': { borderColor: s.borderStrong, backgroundColor: s.hover },
        },
        text: { '&:hover': { backgroundColor: s.hover } },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: RADIUS.md,
          transition: `background-color ${MOTION.fast} ${MOTION.easing}, transform ${MOTION.instant} ${MOTION.easing}`,
          '&:hover': { backgroundColor: s.hover },
          '&:active': { transform: 'scale(0.94)' },
          '&:focus-visible': focusRing,
        },
        // 44px is the WCAG touch-target floor; enforced only where a coarse
        // pointer is actually in use so desktop density is unaffected.
        sizeSmall: {
          padding: 6,
          '@media (pointer: coarse)': { minWidth: 44, minHeight: 44 },
        },
      },
    },

    MuiLink: {
      defaultProps: { underline: 'hover' },
      styleOverrides: {
        root: { '&:focus-visible': { ...focusRing, borderRadius: RADIUS.xs } },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: RADIUS.md,
          backgroundColor: isLight ? 'rgba(15,23,42,0.02)' : 'rgba(255,255,255,0.025)',
          transition: `border-color ${MOTION.fast} ${MOTION.easing}, background-color ${MOTION.fast} ${MOTION.easing}`,
          [`& .${outlinedInputClasses.notchedOutline}`]: { borderWidth: 1, borderColor: s.border },
          '&:hover': {
            [`& .${outlinedInputClasses.notchedOutline}`]: { borderColor: s.borderStrong },
          },
          '&.Mui-focused': {
            backgroundColor: 'transparent',
            [`& .${outlinedInputClasses.notchedOutline}`]: {
              borderColor: theme.palette.primary.main,
              borderWidth: 2,
            },
          },
          '&.Mui-error.Mui-focused': {
            [`& .${outlinedInputClasses.notchedOutline}`]: { borderColor: theme.palette.error.main },
          },
        },
        input: { fontSize: FONT_SIZE.sm, fontFeatureSettings: TABULAR },
        inputSizeSmall: { padding: '8px 12px' },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: FONT_SIZE.sm, '&.Mui-focused': { color: theme.palette.primary.main } },
      },
    },

    MuiFormHelperText: {
      styleOverrides: { root: { fontSize: FONT_SIZE.xs, marginLeft: 2 } },
    },

    MuiSelect: {
      styleOverrides: { select: { fontSize: FONT_SIZE.sm } },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: RADIUS.lg,
          border: `1px solid ${s.border}`,
          boxShadow: shadow.lg,
          backgroundImage: 'none',
        },
        list: { padding: 6 },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: FONT_SIZE.sm,
          borderRadius: RADIUS.sm,
          minHeight: 34,
          '&:hover': { backgroundColor: s.hover },
          '&.Mui-selected': {
            backgroundColor: s.selected,
            '&:hover': { backgroundColor: s.selected },
          },
        },
      },
    },

    MuiTooltip: {
      defaultProps: { arrow: true, enterDelay: 250 },
      styleOverrides: {
        tooltip: {
          backgroundColor: isLight ? '#0f1b2d' : '#1c2a40',
          color: '#f1f5f9',
          fontSize: FONT_SIZE.xs,
          fontWeight: 450,
          lineHeight: 1.45,
          padding: '6px 10px',
          borderRadius: RADIUS.md,
          boxShadow: shadow.md,
          maxWidth: 320,
        },
        arrow: { color: isLight ? '#0f1b2d' : '#1c2a40' },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: RADIUS.sm,
          fontWeight: 600,
          fontSize: FONT_SIZE.xs,
          height: 24,
          '&:focus-visible': focusRing,
        },
        sizeSmall: { height: 20, fontSize: FONT_SIZE.micro },
        label: { paddingLeft: 8, paddingRight: 8 },
      },
    },

    MuiDivider: {
      styleOverrides: { root: { borderColor: s.border } },
    },

    MuiTableCell: {
      styleOverrides: {
        head: {
          color: theme.palette.text.disabled,
          backgroundColor: isLight ? theme.palette.background.paper : s.sunken,
          fontSize: FONT_SIZE.micro,
          fontWeight: 700,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          borderBottom: `1px solid ${s.borderStrong}`,
          whiteSpace: 'nowrap',
          padding: '9px 14px',
        },
        root: {
          fontSize: FONT_SIZE.sm,
          borderBottom: `1px solid ${s.rule}`,
          padding: `${Math.max(4, (d.rowHeight - 20) / 2)}px 14px`,
          fontFeatureSettings: TABULAR,
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: `background-color ${MOTION.instant} ${MOTION.easing}`,
          '&:hover': { backgroundColor: s.hover },
          '&:last-of-type td': { borderBottom: 0 },
        },
      },
    },

    MuiTableSortLabel: {
      styleOverrides: {
        root: {
          '&:focus-visible': { ...focusRing, borderRadius: RADIUS.xs },
          '&.Mui-active': {
            color: accent.main,
            '& .MuiTableSortLabel-icon': { color: `${accent.main} !important` },
          },
        },
      },
    },

    MuiTablePagination: {
      styleOverrides: {
        root: {
          backgroundColor: theme.palette.background.paper,
          borderTop: `1px solid ${s.border}`,
          color: theme.palette.text.secondary,
          fontSize: FONT_SIZE.xs,
        },
        selectLabel: { fontSize: FONT_SIZE.xs },
        displayedRows: { fontSize: FONT_SIZE.xs },
      },
    },

    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          fontSize: FONT_SIZE.sm,
          fontFeatureSettings: TABULAR,
          '--DataGrid-rowBorderColor': s.border,
          '&:focus-visible': focusRing,
        },
        columnHeaders: { borderBottom: `1px solid ${s.border}` },
        columnHeader: {
          backgroundColor: isLight ? theme.palette.background.paper : s.sunken,
          fontSize: FONT_SIZE.micro,
          fontWeight: 700,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          color: theme.palette.text.disabled,
          '&:focus, &:focus-within': { outline: 'none' },
        },
        row: {
          transition: `background-color ${MOTION.instant} ${MOTION.easing}`,
          '&:hover': { backgroundColor: s.hover },
          '&.Mui-selected': {
            backgroundColor: s.selected,
            '&:hover': { backgroundColor: s.selected },
          },
        },
        cell: {
          borderBottom: `1px solid ${isLight ? 'rgba(15,23,42,0.06)' : 'rgba(148,163,184,0.09)'}`,
          '&:focus, &:focus-within': { outline: 'none' },
        },
        footerContainer: {
          backgroundColor: theme.palette.background.paper,
          borderTop: `1px solid ${s.border}`,
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: theme.palette.background.paper,
          backgroundImage: 'none',
          border: `1px solid ${s.border}`,
          borderRadius: RADIUS.xl,
          boxShadow: shadow.lg,
        },
      },
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: { fontSize: FONT_SIZE.lg, fontWeight: 650, padding: '18px 20px 10px' },
      },
    },

    MuiDialogContent: {
      styleOverrides: { root: { padding: '10px 20px' } },
    },

    MuiDialogActions: {
      styleOverrides: { root: { padding: '14px 20px 18px', gap: 8 } },
    },

    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: isLight ? 'rgba(15,23,42,0.32)' : 'rgba(2,4,10,0.68)',
          backdropFilter: 'blur(3px)',
        },
      },
    },

    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: `${RADIUS.sm}px !important`,
          fontWeight: 550,
          fontSize: FONT_SIZE.sm,
          color: theme.palette.text.secondary,
          border: `1px solid ${s.border} !important`,
          padding: '4px 11px',
          transition: `background-color ${MOTION.fast} ${MOTION.easing}, color ${MOTION.fast} ${MOTION.easing}`,
          '&:focus-visible': focusRing,
          '&.Mui-selected': {
            backgroundColor: alpha(theme.palette.primary.main, 0.14),
            color: isLight ? theme.palette.primary.dark : theme.palette.primary.light,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.35)} !important`,
            '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) },
          },
          '&:hover': { backgroundColor: s.hover },
        },
      },
    },

    MuiToggleButtonGroup: {
      styleOverrides: {
        root: { gap: 4, '& .MuiToggleButtonGroup-grouped': { margin: '0 !important' } },
      },
    },

    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 40 },
        indicator: { height: 2, borderRadius: 2 },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontSize: FONT_SIZE.sm,
          fontWeight: 550,
          minHeight: 40,
          padding: '8px 14px',
          '&:focus-visible': { ...focusRing, borderRadius: RADIUS.sm },
        },
      },
    },

    MuiSkeleton: {
      defaultProps: { animation: 'wave' },
      styleOverrides: {
        root: { backgroundColor: isLight ? 'rgba(15,23,42,0.07)' : 'rgba(148,163,184,0.10)' },
        rounded: { borderRadius: RADIUS.md },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: RADIUS.md, fontSize: FONT_SIZE.sm, border: `1px solid transparent` },
        standardInfo: {
          backgroundColor: alpha(theme.palette.info.main, 0.12),
          borderColor: alpha(theme.palette.info.main, 0.28),
          color: isLight ? theme.palette.info.dark : theme.palette.info.light,
        },
        standardSuccess: {
          backgroundColor: alpha(theme.palette.success.main, 0.12),
          borderColor: alpha(theme.palette.success.main, 0.28),
          color: isLight ? theme.palette.success.dark : theme.palette.success.light,
        },
        standardWarning: {
          backgroundColor: alpha(theme.palette.warning.main, 0.12),
          borderColor: alpha(theme.palette.warning.main, 0.28),
          color: isLight ? theme.palette.warning.dark : theme.palette.warning.light,
        },
        standardError: {
          backgroundColor: alpha(theme.palette.error.main, 0.12),
          borderColor: alpha(theme.palette.error.main, 0.28),
          color: isLight ? theme.palette.error.dark : theme.palette.error.light,
        },
      },
    },

    MuiSwitch: {
      styleOverrides: {
        root: { '& .MuiSwitch-switchBase:focus-visible + .MuiSwitch-track': focusRing },
      },
    },

    MuiCheckbox: {
      styleOverrides: { root: { '&:focus-visible': { ...focusRing, borderRadius: RADIUS.sm } } },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: RADIUS.md,
          '&:focus-visible': focusRing,
        },
      },
    },

    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${s.border}`,
          borderRadius: `${RADIUS.lg}px !important`,
          '&::before': { display: 'none' },
        },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 6, borderRadius: RADIUS.pill, backgroundColor: s.hover },
        bar: { borderRadius: RADIUS.pill },
      },
    },
  };
}
