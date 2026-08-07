import * as React from 'react';

import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import LocalStorageUtil from '@/utils/localStorage';

import { overrides } from './overrides';
import palette from './palette';
import {
  getInitialDensity,
  getInitialThemeMode,
  ThemeModeContext,
  type ThemeMode,
} from './ThemeModeContext';
import { RADIUS, SHADOW, type Density } from './tokens';
import typography from './typography';

function getSystemIsDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<ThemeMode>(getInitialThemeMode);
  const [density, setDensityState] = React.useState<Density>(getInitialDensity);
  const [systemIsDark, setSystemIsDark] = React.useState(getSystemIsDark);

  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setMode = React.useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    LocalStorageUtil.setItem('theme_mode', newMode);
  }, []);

  const setDensity = React.useCallback((next: Density) => {
    setDensityState(next);
    LocalStorageUtil.setItem('ui_density', next);
  }, []);

  const resolvedMode: 'dark' | 'light' = mode === 'system' ? (systemIsDark ? 'dark' : 'light') : mode;

  const theme = React.useMemo(() => {
    const base = createTheme({
      palette: palette(resolvedMode),
      typography,
      shape: { borderRadius: RADIUS.md },
      // A flat elevation ramp: surfaces separate by border and background, not
      // by stacked shadow, which keeps dense layouts from looking muddy.
      shadows: [
        'none',
        ...Array.from({ length: 24 }, (_, i) => {
          const ramp = SHADOW[resolvedMode];
          if (i < 3) return ramp.xs;
          if (i < 8) return ramp.sm;
          if (i < 16) return ramp.md;
          return ramp.lg;
        }),
      ] as never,
    });

    base.components = overrides(base, density) as never;
    return base;
  }, [resolvedMode, density]);

  // Keeps the mobile browser chrome in step with the app background.
  React.useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', theme.palette.background.default);
  }, [theme]);

  const value = React.useMemo(
    () => ({ mode, resolvedMode, setMode, density, setDensity }),
    [mode, resolvedMode, setMode, density, setDensity]
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
