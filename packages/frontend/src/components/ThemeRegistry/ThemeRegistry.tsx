'use client';
import * as React from 'react';

import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import LocalStorageUtil from '@/utils/localStorage';

import { overrides } from './overrides';
import palette from './palette';
import { getInitialThemeMode, ThemeModeContext, type ThemeMode } from './ThemeModeContext';

function getSystemIsDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<ThemeMode>(getInitialThemeMode);
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

  const resolvedMode: 'dark' | 'light' =
    mode === 'system' ? (systemIsDark ? 'dark' : 'light') : mode;

  const theme = React.useMemo(() => {
    const t = createTheme({
      palette: palette(resolvedMode),
      typography: {
        fontFamily: 'M PLUS Rounded 1c, sans-serif',
      },
      components: {
        MuiAlert: {
          styleOverrides: {
            root: ({ ownerState }: any) => ({
              ...(ownerState.severity === 'info' && {
                backgroundColor: '#60a5fa',
              }),
            }),
          },
        },
        MuiTablePagination: {
          styleOverrides: {
            root: {
              backgroundColor: palette(resolvedMode).background?.paper,
            },
          },
        },
      },
    });
    t.components = overrides(t);
    return t;
  }, [resolvedMode]);

  return (
    <ThemeModeContext.Provider value={{ mode, resolvedMode, setMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
