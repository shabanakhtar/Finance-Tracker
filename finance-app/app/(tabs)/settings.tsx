import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, SegmentedButtons, Text } from 'react-native-paper';
import { useState } from 'react';

import { AppPalette, AppThemeMode, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useAppTheme } from '@/contexts/theme';
import { CsvImportPreview, exportTransactionsCsv, importTransactionsCsv, previewTransactionsCsv } from '@/services/api';

const themeOptions = [
  { value: 'dark', label: 'Dark', icon: 'weather-night' },
  { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
  { value: 'system', label: 'System', icon: 'cellphone-cog' },
];

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const { colors, mode, resolvedTheme, setMode } = useAppTheme();
  const styles = createStyles(colors);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<CsvImportPreview | null>(null);
  const profileName =
    session?.user.user_metadata?.full_name ??
    session?.user.user_metadata?.name ??
    session?.user.user_metadata?.first_name ??
    'Signed in';

  const exportCsv = async () => {
    try {
      setExporting(true);
      const result = await exportTransactionsCsv();
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing unavailable', 'CSV export is ready, but this device cannot open the share sheet.');
        return;
      }
      if (!FileSystem.cacheDirectory) {
        Alert.alert('Export failed', 'This device does not provide a temporary file directory.');
        return;
      }

      const fileUri = `${FileSystem.cacheDirectory}${result.filename}`;
      await FileSystem.writeAsStringAsync(fileUri, result.csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        UTI: 'public.comma-separated-values-text',
      });
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Could not export transactions.');
    } finally {
      setExporting(false);
    }
  };

  const pickCsv = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', 'application/vnd.ms-excel'],
      });

      if (result.canceled || !result.assets[0]) return;

      const text = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const nextPreview = await previewTransactionsCsv(text);
      setCsvText(text);
      setPreview(nextPreview);
    } catch (err) {
      Alert.alert('Import preview failed', err instanceof Error ? err.message : 'Could not read this CSV.');
    }
  };

  const confirmImport = async () => {
    if (!csvText || !preview) return;
    if (preview.error_count > 0) {
      Alert.alert('Fix CSV first', 'Invalid rows must be fixed before importing.');
      return;
    }

    try {
      setImporting(true);
      const result = await importTransactionsCsv(csvText);
      Alert.alert('Import complete', `${result.imported ?? result.valid_count} transactions imported.`);
      setCsvText(null);
      setPreview(null);
    } catch (err) {
      Alert.alert('Import failed', err instanceof Error ? err.message : 'Could not import transactions.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
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
        <Text style={styles.muted}>{profileName}</Text>
        <Text style={styles.muted}>{session?.user.email ?? 'Your private workspace'}</Text>
        <Button icon="logout" mode="outlined" onPress={signOut} style={styles.signOut}>
          Sign Out
        </Button>
      </View>

      <View style={styles.panel}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.sectionTitle}>Data portability</Text>
            <Text style={styles.muted}>Export a backup or import transactions from a CSV file.</Text>
          </View>
          <MaterialCommunityIcons color={colors.sky} name="file-delimited-outline" size={24} />
        </View>
        <View style={styles.actionRow}>
          <Button disabled={exporting || importing} icon="download-outline" loading={exporting} mode="contained" onPress={exportCsv} style={styles.actionButton}>
            Export CSV
          </Button>
          <Button disabled={exporting || importing} icon="upload-outline" mode="outlined" onPress={pickCsv} style={styles.actionButton}>
            Import CSV
          </Button>
        </View>
        {preview ? (
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>Import preview</Text>
            <Text style={styles.muted}>
              {preview.valid_count} valid rows, {preview.error_count} rows need fixes.
            </Text>
            {preview.preview.slice(0, 3).map((row) => (
              <Text key={`${row.row}-${row.date}-${row.category}`} style={styles.previewRow}>
                {row.date} - {row.type} - {row.category} - {row.amount}
              </Text>
            ))}
            {preview.errors.slice(0, 3).map((row) => (
              <Text key={`${row.row}-error`} style={styles.errorText}>
                Row {row.row}: {row.errors.join(', ')}
              </Text>
            ))}
            <Button
              disabled={preview.error_count > 0 || importing}
              icon="database-import-outline"
              loading={importing}
              mode="contained"
              onPress={confirmImport}
              style={styles.importButton}>
              Confirm Import
            </Button>
          </View>
        ) : null}
      </View>

    </ScrollView>
  );
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    actionButton: {
      borderRadius: radii.card,
      flex: 1,
    },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    errorText: {
      color: colors.coral,
      fontSize: 13,
      lineHeight: 18,
    },
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
    previewBox: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: radii.card,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md,
    },
    previewRow: {
      color: colors.ink,
      fontSize: 13,
      lineHeight: 18,
    },
    previewTitle: {
      color: colors.ink,
      fontSize: 15,
      fontWeight: '900',
    },
    importButton: {
      borderRadius: radii.card,
      marginTop: spacing.xs,
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'space-between',
    },
    rowText: {
      flex: 1,
    },
    screen: {
      backgroundColor: colors.background,
      flexGrow: 1,
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
