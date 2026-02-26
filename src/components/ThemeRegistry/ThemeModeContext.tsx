import * as React from 'react';

import LocalStorageUtil from '@/utils/localStorage';

type ThemeMode = 'dark' | 'light';

type ThemeModeContextType = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

export const ThemeModeContext = React.createContext<ThemeModeContextType>({
  mode: 'dark',
  setMode: () => {},
});

export function useThemeMode() {
  return React.useContext(ThemeModeContext);
}

export function getInitialThemeMode(): ThemeMode {
  return LocalStorageUtil.getItem<ThemeMode>('theme_mode') ?? 'dark';
}
