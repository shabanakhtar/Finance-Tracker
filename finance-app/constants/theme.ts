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
  amber: '#ea7a1f',
  background: '#fbf6ee',
  balanceMuted: '#eadfd0',
  balancePill: '#3a2817',
  balancePillText: '#fff4de',
  balanceSurface: '#20150c',
  balanceText: '#ffffff',
  border: '#eadfce',
  coral: '#dc3f49',
  coralSoft: '#fff0ec',
  emerald: '#15803d',
  emeraldDark: '#14532d',
  emeraldSoft: '#eaf8ee',
  ink: '#18130d',
  muted: '#756a5d',
  muted2: '#a49787',
  sky: '#d97706',
  skySoft: '#fff2da',
  surface: '#ffffff',
  surface2: '#f5eadb',
  violet: '#7c3aed',
  violetSoft: '#f2eafd',
  warningSoft: '#fff4d8',
};

export const darkPalette: AppPalette = {
  amber: '#f59e0b',
  background: '#050714',
  balanceMuted: '#b8c7ff',
  balancePill: '#102a5a',
  balancePillText: '#dff4ff',
  balanceSurface: '#071024',
  balanceText: '#ffffff',
  border: '#1e2a48',
  coral: '#fb7185',
  coralSoft: '#351722',
  emerald: '#22c55e',
  emeraldDark: '#86efac',
  emeraldSoft: '#102d22',
  ink: '#f8fbff',
  muted: '#a8b3c7',
  muted2: '#69758f',
  sky: '#38bdf8',
  skySoft: '#0b2542',
  surface: '#0b1020',
  surface2: '#121a33',
  violet: '#a78bfa',
  violetSoft: '#25184a',
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
