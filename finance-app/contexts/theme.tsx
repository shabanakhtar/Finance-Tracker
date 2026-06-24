import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { AppPalette, AppThemeMode, AppThemeName, themePalettes } from '@/constants/theme';

const THEME_STORAGE_KEY = 'finance-tracker-theme';

type ThemeContextValue = {
  colors: AppPalette;
  mode: AppThemeMode;
  resolvedTheme: AppThemeName;
  setMode: (mode: AppThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function readStoredTheme(): Promise<AppThemeMode | null> {
  if (Platform.OS === 'web') {
    const value = globalThis.localStorage?.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' || value === 'system' ? value : null;
  }

  const value = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
  return value === 'light' || value === 'dark' || value === 'system' ? value : null;
}

async function storeTheme(mode: AppThemeMode) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(THEME_STORAGE_KEY, mode);
    return;
  }

  await SecureStore.setItemAsync(THEME_STORAGE_KEY, mode);
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<AppThemeMode>('light');

  useEffect(() => {
    readStoredTheme().then((stored) => {
      if (stored) setModeState(stored);
    });
  }, []);

  const resolvedTheme: AppThemeName = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const colors = themePalettes[resolvedTheme];

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors,
      mode,
      resolvedTheme,
      setMode: async (nextMode) => {
        setModeState(nextMode);
        await storeTheme(nextMode);
      },
    }),
    [colors, mode, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }
  return value;
}
