import * as React from 'react';

import LocalStorageUtil from '@/utils/localStorage';

import type { Density } from './tokens';

export type ThemeMode = 'dark' | 'light' | 'system';

type ThemeModeContextType = {
  mode: ThemeMode;
  resolvedMode: 'dark' | 'light';
  setMode: (mode: ThemeMode) => void;
  density: Density;
  setDensity: (density: Density) => void;
};

export const ThemeModeContext = React.createContext<ThemeModeContextType>({
  mode: 'dark',
  resolvedMode: 'dark',
  setMode: () => {},
  density: 'comfortable',
  setDensity: () => {},
});

export function useThemeMode() {
  return React.useContext(ThemeModeContext);
}

export function getInitialThemeMode(): ThemeMode {
  return LocalStorageUtil.getItem<ThemeMode>('theme_mode') ?? 'system';
}

export function getInitialDensity(): Density {
  return LocalStorageUtil.getItem<Density>('ui_density') ?? 'comfortable';
}
