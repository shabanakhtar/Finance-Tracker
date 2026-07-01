import { Platform } from 'react-native';

export type AppThemeMode = 'system' | 'light' | 'dark';
export type AppThemeName = 'light' | 'dark';

export type AppPalette = {
  amber: string;
  background: string;
  balanceMuted: string;
  balancePill: string;
  balancePillText: string;
  balanceSurface: string;
  balanceText: string;
  border: string;
  coral: string;
  coralSoft: string;
  emerald: string;
  emeraldDark: string;
  emeraldSoft: string;
  ink: string;
  muted: string;
  muted2: string;
  sky: string;
  skySoft: string;
  surface: string;
  surface2: string;
  violet: string;
  violetSoft: string;
  warningSoft: string;
};

export const lightPalette: AppPalette = {
  amber: '#d97706',
  background: '#f7f3ea',
  balanceMuted: '#b7c4d6',
  balancePill: '#14395c',
  balancePillText: '#d9fbf6',
  balanceSurface: '#0b2540',
  balanceText: '#ffffff',
  border: '#e4dccf',
  coral: '#dc2626',
  coralSoft: '#fee2e2',
  emerald: '#16a34a',
  emeraldDark: '#166534',
  emeraldSoft: '#dcfce7',
  ink: '#111827',
  muted: '#667085',
  muted2: '#98a2b3',
  sky: '#0f766e',
  skySoft: '#e0f7f3',
  surface: '#ffffff',
  surface2: '#fbf8f1',
  violet: '#7c3aed',
  violetSoft: '#f3edff',
  warningSoft: '#fff7ed',
};

export const darkPalette: AppPalette = {
  amber: '#f59e0b',
  background: '#07111f',
  balanceMuted: '#a7b3c2',
  balancePill: '#132b45',
  balancePillText: '#cffafe',
  balanceSurface: '#081a2e',
  balanceText: '#ffffff',
  border: '#223a55',
  coral: '#f87171',
  coralSoft: '#3b1722',
  emerald: '#22c55e',
  emeraldDark: '#86efac',
  emeraldSoft: '#0f3325',
  ink: '#f8fafc',
  muted: '#a7b3c2',
  muted2: '#718096',
  sky: '#22d3ee',
  skySoft: '#12384a',
  surface: '#0f2137',
  surface2: '#132b45',
  violet: '#a78bfa',
  violetSoft: '#2b1f55',
  warningSoft: '#332810',
};

export const themePalettes = {
  light: lightPalette,
  dark: darkPalette,
};

export const palette = lightPalette;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radii = {
  card: 8,
  pill: 999,
};

export const Colors = {
  light: {
    text: lightPalette.ink,
    background: lightPalette.background,
    tint: lightPalette.sky,
    icon: lightPalette.muted,
    tabIconDefault: lightPalette.muted,
    tabIconSelected: lightPalette.sky,
  },
  dark: {
    text: darkPalette.ink,
    background: darkPalette.background,
    tint: darkPalette.sky,
    icon: darkPalette.muted,
    tabIconDefault: darkPalette.muted,
    tabIconSelected: darkPalette.sky,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
