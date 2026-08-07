import { FONT_SIZE, FONT_STACK, TABULAR } from './tokens';

// A compressed, dense scale. Headings stay small on purpose: on a dashboard the
// data is the headline, so a page title competing with a portfolio total for
// attention is a hierarchy bug.

const typography = {
  fontFamily: FONT_STACK,
  fontWeightLight: 400,
  fontWeightRegular: 450,
  fontWeightMedium: 550,
  fontWeightBold: 680,

  h1: { fontSize: FONT_SIZE.hero, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em', fontFeatureSettings: TABULAR },
  h2: { fontSize: FONT_SIZE.display, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.025em', fontFeatureSettings: TABULAR },
  h3: { fontSize: '1.375rem', fontWeight: 680, lineHeight: 1.25, letterSpacing: '-0.02em' },
  h4: { fontSize: FONT_SIZE.xl, fontWeight: 680, lineHeight: 1.3, letterSpacing: '-0.018em' },
  h5: { fontSize: FONT_SIZE.lg, fontWeight: 650, lineHeight: 1.35, letterSpacing: '-0.014em' },
  h6: { fontSize: FONT_SIZE.md, fontWeight: 650, lineHeight: 1.4, letterSpacing: '-0.01em' },

  subtitle1: { fontSize: FONT_SIZE.md, fontWeight: 600, lineHeight: 1.5 },
  subtitle2: { fontSize: FONT_SIZE.sm, fontWeight: 600, lineHeight: 1.5 },

  body1: { fontSize: FONT_SIZE.md, fontWeight: 450, lineHeight: 1.55 },
  body2: { fontSize: FONT_SIZE.sm, fontWeight: 450, lineHeight: 1.5 },

  caption: { fontSize: FONT_SIZE.xs, fontWeight: 450, lineHeight: 1.45 },
  overline: {
    fontSize: FONT_SIZE.micro,
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '0.07em',
    textTransform: 'uppercase' as const,
  },

  button: { fontSize: FONT_SIZE.sm, fontWeight: 550, lineHeight: 1.5, textTransform: 'none' as const },
};

export default typography;
