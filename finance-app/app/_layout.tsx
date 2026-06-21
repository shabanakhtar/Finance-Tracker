import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import { AuthGate } from '@/components/auth-gate';
import { palette } from '@/constants/theme';
import { AuthProvider } from '@/contexts/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const paperTheme = {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: palette.emerald,
      onPrimary: '#ffffff',
      primaryContainer: palette.emeraldSoft,
      onPrimaryContainer: palette.emeraldDark,
      secondary: palette.sky,
      surface: palette.surface,
      background: palette.background,
      error: palette.coral,
      onError: '#ffffff',
      onSurface: palette.ink,
      onSurfaceVariant: palette.muted,
      outline: palette.border,
    },
  };

  return (
    <PaperProvider theme={paperTheme}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthGate>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
          </AuthGate>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </PaperProvider>
  );
}
