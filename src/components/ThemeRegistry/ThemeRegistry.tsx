'use client';
import * as React from 'react';

import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import LocalStorageUtil from '@/utils/localStorage';

import { overrides } from './overrides';
import palette from './palette';
import { getInitialThemeMode, ThemeModeContext } from './ThemeModeContext';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<'dark' | 'light'>(getInitialThemeMode);

  const setMode = React.useCallback((newMode: 'dark' | 'light') => {
    setModeState(newMode);
    LocalStorageUtil.setItem('theme_mode', newMode);
  }, []);

  const theme = React.useMemo(() => {
    const t = createTheme({
      palette: palette(mode),
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
              backgroundColor: palette(mode).background?.paper,
            },
          },
        },
      },
    });
    t.components = overrides(t);
    return t;
  }, [mode]);

  return (
    <ThemeModeContext.Provider value={{ mode, setMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
