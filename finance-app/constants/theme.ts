import { Platform } from 'react-native';

export const palette = {
  amber: '#d97706',
  background: '#f6faf8',
  border: '#dce8e4',
  coral: '#c2412d',
  coralSoft: '#fff1ee',
  emerald: '#0f766e',
  emeraldDark: '#0b4f49',
  emeraldSoft: '#e6f5ef',
  ink: '#111827',
  muted: '#667085',
  muted2: '#98a2b3',
  sky: '#2563eb',
  skySoft: '#edf4ff',
  surface: '#ffffff',
  warningSoft: '#fff7e6',
};

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
    text: palette.ink,
    background: palette.background,
    tint: palette.emerald,
    icon: palette.muted,
    tabIconDefault: palette.muted,
    tabIconSelected: palette.emerald,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#ffffff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#ffffff',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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
