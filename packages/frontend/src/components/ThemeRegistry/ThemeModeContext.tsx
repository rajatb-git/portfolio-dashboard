import * as React from 'react';

import LocalStorageUtil from '@/utils/localStorage';

export type ThemeMode = 'dark' | 'light' | 'system';

type ThemeModeContextType = {
  mode: ThemeMode;
  resolvedMode: 'dark' | 'light';
  setMode: (mode: ThemeMode) => void;
};

export const ThemeModeContext = React.createContext<ThemeModeContextType>({
  mode: 'dark',
  resolvedMode: 'dark',
  setMode: () => {},
});

export function useThemeMode() {
  return React.useContext(ThemeModeContext);
}

export function getInitialThemeMode(): ThemeMode {
  return LocalStorageUtil.getItem<ThemeMode>('theme_mode') ?? 'system';
}
