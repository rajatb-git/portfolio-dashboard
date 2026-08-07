import { alpha } from '@mui/material/styles';

import {
  ERROR,
  GREY,
  INFO,
  type Mode,
  PRIMARY,
  SECONDARY,
  SUCCESS,
  SURFACE,
  TEXT,
  WARNING,
} from './tokens';

const COMMON = {
  common: { black: '#000000', white: '#ffffff' },
  primary: PRIMARY,
  secondary: SECONDARY,
  info: INFO,
  success: SUCCESS,
  warning: WARNING,
  error: ERROR,
  grey: GREY,
  action: {
    hoverOpacity: 0.06,
    disabledOpacity: 0.42,
    selectedOpacity: 0.12,
    focusOpacity: 0.12,
    activatedOpacity: 0.12,
  },
};

export default function palette(themeMode: Mode) {
  const s = SURFACE[themeMode];
  const t = TEXT[themeMode];
  const isLight = themeMode === 'light';

  return {
    ...COMMON,
    mode: themeMode,
    divider: s.border,
    text: {
      primary: t.primary,
      secondary: t.secondary,
      disabled: t.disabled,
    },
    background: {
      default: s.canvas,
      paper: s.paper,
      neutral: s.sunken,
    },
    action: {
      ...COMMON.action,
      active: isLight ? GREY[600] : GREY[400],
      hover: s.hover,
      selected: s.selected,
      focus: alpha(PRIMARY.main, 0.24),
      disabled: t.disabled,
      disabledBackground: alpha(GREY[500], isLight ? 0.16 : 0.12),
    },
  } as const;
}
