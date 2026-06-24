import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { MD3DarkTheme, MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import { AuthGate } from '@/components/auth-gate';
import { AuthProvider } from '@/contexts/auth';
import { AppThemeProvider, useAppTheme } from '@/contexts/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <ThemedRootLayout />
    </AppThemeProvider>
  );
}

function ThemedRootLayout() {
  const { colors, resolvedTheme } = useAppTheme();
  const basePaperTheme = resolvedTheme === 'dark' ? MD3DarkTheme : MD3LightTheme;
  const navigationTheme = resolvedTheme === 'dark' ? DarkTheme : DefaultTheme;
  const paperTheme = {
    ...basePaperTheme,
    colors: {
      ...basePaperTheme.colors,
      primary: colors.sky,
      onPrimary: '#ffffff',
      primaryContainer: colors.skySoft,
      onPrimaryContainer: colors.ink,
      secondary: colors.violet,
      surface: colors.surface,
      background: colors.background,
      error: colors.coral,
      onError: '#ffffff',
      onSurface: colors.ink,
      onSurfaceVariant: colors.muted,
      outline: colors.border,
    },
  };
  const appNavigationTheme = {
    ...navigationTheme,
    colors: {
      ...navigationTheme.colors,
      background: colors.background,
      border: colors.border,
      card: colors.surface,
      primary: colors.sky,
      text: colors.ink,
    },
  };

  return (
    <PaperProvider theme={paperTheme}>
      <AuthProvider>
        <ThemeProvider value={appNavigationTheme}>
          <AuthGate>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="quick-add" options={{ headerShown: false, presentation: 'modal' }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
          </AuthGate>
          <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </AuthProvider>
    </PaperProvider>
  );
}
