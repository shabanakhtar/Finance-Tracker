import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, SegmentedButtons, Text } from 'react-native-paper';

import { AppPalette, AppThemeMode, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useAppTheme } from '@/contexts/theme';

const themeOptions = [
  { value: 'dark', label: 'Dark', icon: 'weather-night' },
  { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
  { value: 'system', label: 'System', icon: 'cellphone-cog' },
];

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const { colors, mode, resolvedTheme, setMode } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons color={colors.sky} name="cog-outline" size={24} />
        </View>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Tune the app for your eyes and your workflow.</Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.row}>
          <View>
            <Text style={styles.sectionTitle}>Theme</Text>
            <Text style={styles.muted}>Current look: {resolvedTheme === 'dark' ? 'Electric dark' : 'Warm light'}</Text>
          </View>
          <MaterialCommunityIcons color={colors.violet} name="palette-outline" size={24} />
        </View>
        <SegmentedButtons
          buttons={themeOptions}
          onValueChange={(value) => setMode(value as AppThemeMode)}
          value={mode}
        />
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.muted}>{session?.user.email ?? 'Signed in'}</Text>
        <Button icon="logout" mode="outlined" onPress={signOut} style={styles.signOut}>
          Sign Out
        </Button>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Build</Text>
        <Text style={styles.muted}>Supabase auth, Vercel API, Gemini AI assistant, and UptimeRobot monitoring.</Text>
      </View>
    </View>
  );
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    header: {
      gap: spacing.sm,
    },
    iconBox: {
      alignItems: 'center',
      backgroundColor: colors.skySoft,
      borderColor: colors.border,
      borderRadius: radii.card,
      borderWidth: 1,
      height: 48,
      justifyContent: 'center',
      width: 48,
    },
    muted: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
    },
    panel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radii.card,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.lg,
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    screen: {
      backgroundColor: colors.background,
      flex: 1,
      gap: spacing.lg,
      padding: spacing.xl,
      paddingTop: 34,
    },
    sectionTitle: {
      color: colors.ink,
      fontSize: 18,
      fontWeight: '900',
    },
    signOut: {
      borderColor: colors.border,
      borderRadius: radii.card,
      marginTop: spacing.sm,
    },
    subtitle: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 22,
    },
    title: {
      color: colors.ink,
      fontSize: 32,
      fontWeight: '900',
      letterSpacing: 0,
    },
  });
}
