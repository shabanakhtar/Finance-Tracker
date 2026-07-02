import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Chip, SegmentedButtons, Text } from 'react-native-paper';
import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPalette, radii, spacing } from '@/constants/theme';
import { getFloatingTabBarBottomPadding } from '@/components/navigation/floating-tab-bar';
import {
  AppErrorState,
  ConfirmDialog,
  CurrencyToggle,
  EmptyState,
  FormField,
  KeyboardAwareScrollView,
  MoneyField,
  SuccessBanner,
  SuccessPulse,
  ThemeToggle,
  triggerSuccess,
  triggerWarning,
} from '@/components/ux';
import { useAuth } from '@/contexts/auth';
import { useCurrency } from '@/contexts/currency';
import { useAppTheme } from '@/contexts/theme';
import { CsvImportPreview, exportTransactionsCsv, importTransactionsCsv, previewTransactionsCsv } from '@/services/api';
import { formatCategoryLabel } from '@/services/formatters';
import {
  defaultQuickAddShortcuts,
  draftToShortcut,
  getQuickAddShortcuts,
  quickAddIconOptions,
  QuickAddShortcut,
  QuickAddShortcutDraft,
  QuickAddShortcutType,
  resetQuickAddShortcuts,
  saveQuickAddShortcuts,
  shortcutToDraft,
  validateQuickAddShortcut,
} from '@/services/quickAddShortcuts';
import { setSetupDismissed as persistSetupDismissed } from '@/services/setupProgress';

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const { currency, currencyLabel, setCurrency } = useCurrency();
  const { colors, mode, resolvedTheme, setMode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets.bottom);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CsvImportPreview | null>(null);
  const [signOutVisible, setSignOutVisible] = useState(false);
  const [shortcutDraft, setShortcutDraft] = useState<QuickAddShortcutDraft>(() => shortcutToDraft(defaultQuickAddShortcuts[0]));
  const [shortcutFeedback, setShortcutFeedback] = useState<string | null>(null);
  const [shortcutError, setShortcutError] = useState<string | null>(null);
  const [shortcuts, setShortcuts] = useState<QuickAddShortcut[]>(defaultQuickAddShortcuts);
  const [setupFeedback, setSetupFeedback] = useState<string | null>(null);
  const shortcutValidation = useMemo(() => validateQuickAddShortcut(shortcutDraft), [shortcutDraft]);
  const shortcutHasErrors = Object.keys(shortcutValidation).length > 0;
  const profileName =
    session?.user.user_metadata?.full_name ??
    session?.user.user_metadata?.name ??
    session?.user.user_metadata?.first_name ??
    'Signed in';

  useEffect(() => {
    getQuickAddShortcuts()
      .then((items) => {
        setShortcuts(items);
        setShortcutDraft(shortcutToDraft(items[0] ?? defaultQuickAddShortcuts[0]));
      })
      .catch(() => {
        setShortcuts(defaultQuickAddShortcuts);
      });
  }, []);

  const selectShortcut = (shortcut: QuickAddShortcut) => {
    setShortcutDraft(shortcutToDraft(shortcut));
    setShortcutError(null);
    setShortcutFeedback(null);
  };

  const updateShortcutDraft = <Key extends keyof QuickAddShortcutDraft>(key: Key, value: QuickAddShortcutDraft[Key]) => {
    setShortcutDraft((current) => ({ ...current, [key]: value }));
  };

  const saveShortcut = async () => {
    setShortcutFeedback(null);
    setShortcutError(null);
    const validation = validateQuickAddShortcut(shortcutDraft);
    if (Object.keys(validation).length > 0) {
      triggerWarning();
      setShortcutError('Fix the highlighted shortcut fields before saving.');
      return;
    }

    const nextShortcut = draftToShortcut(shortcutDraft);
    const nextShortcuts = shortcuts.map((shortcut) => (shortcut.id === nextShortcut.id ? nextShortcut : shortcut));
    await saveQuickAddShortcuts(nextShortcuts);
    setShortcuts(nextShortcuts);
    setShortcutDraft(shortcutToDraft(nextShortcut));
    triggerSuccess();
    setShortcutFeedback(`${nextShortcut.label} shortcut updated.`);
  };

  const resetShortcuts = async () => {
    const nextShortcuts = await resetQuickAddShortcuts();
    setShortcuts(nextShortcuts);
    setShortcutDraft(shortcutToDraft(nextShortcuts[0]));
    setShortcutError(null);
    triggerSuccess();
    setShortcutFeedback('Quick Add shortcuts reset to defaults.');
  };

  const exportCsv = async () => {
    try {
      setFeedback(null);
      setImportError(null);
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
      setImportError(err instanceof Error ? err.message : 'Could not export transactions.');
    } finally {
      setExporting(false);
    }
  };

  const pickCsv = async () => {
    try {
      setFeedback(null);
      setImportError(null);
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
      setImportError(err instanceof Error ? err.message : 'Could not read this CSV.');
    }
  };

  const confirmImport = async () => {
    if (!csvText || !preview) return;
    if (preview.error_count > 0) {
      setImportError('Invalid rows must be fixed before importing.');
      return;
    }

    try {
      setFeedback(null);
      setImportError(null);
      setImporting(true);
      const result = await importTransactionsCsv(csvText);
      setFeedback(`${result.imported ?? result.valid_count} transactions imported.`);
      setCsvText(null);
      setPreview(null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not import transactions.');
    } finally {
      setImporting(false);
    }
  };

  const restoreSetup = async () => {
    await persistSetupDismissed(false);
    setSetupFeedback('The setup guide will appear at the top of Home until income, expense, and budget essentials are finished.');
  };

  return (
    <KeyboardAwareScrollView containerStyle={styles.keyboard} contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons color={colors.sky} name="cog-outline" size={24} />
        </View>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Tune the app for your eyes and your workflow.</Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <Text style={styles.muted}>Theme: {resolvedTheme === 'dark' ? 'Dark' : 'Light'} · Currency: {currencyLabel}</Text>
          </View>
          <MaterialCommunityIcons color={colors.sky} name="tune-variant" size={24} />
        </View>
        <View style={styles.preferenceGroup}>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceLabelRow}>
              <MaterialCommunityIcons color={colors.sky} name="palette-outline" size={20} />
              <Text style={styles.preferenceLabel}>Theme</Text>
            </View>
            <ThemeToggle onValueChange={setMode} value={mode} />
          </View>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceLabelRow}>
              <MaterialCommunityIcons color={colors.emerald} name="cash-multiple" size={20} />
              <Text style={styles.preferenceLabel}>Default currency</Text>
            </View>
            <CurrencyToggle onValueChange={setCurrency} value={currency} />
          </View>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.muted}>{profileName}</Text>
        <Text style={styles.muted}>{session?.user.email ?? 'Your private workspace'}</Text>
        <Button icon="logout" mode="outlined" onPress={() => setSignOutVisible(true)} style={styles.signOut}>
          Sign Out
        </Button>
      </View>

      <View style={styles.panel}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.sectionTitle}>Setup guide</Text>
            <Text style={styles.muted}>Show the Home setup guide again.</Text>
          </View>
          <MaterialCommunityIcons color={colors.sky} name="map-marker-path" size={24} />
        </View>
        <Button icon="map-marker-path" mode="outlined" onPress={restoreSetup} style={styles.restoreSetupButton}>
          Show setup guide
        </Button>
        {setupFeedback ? <SuccessBanner message={setupFeedback} title="Setup guide restored" /> : null}
      </View>

      <View style={styles.panel}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.sectionTitle}>Quick Add shortcuts</Text>
            <Text style={styles.muted}>Edit the tiles used on Home and Quick Add.</Text>
          </View>
          <MaterialCommunityIcons color={colors.violet} name="tune-variant" size={24} />
        </View>
        <View style={styles.shortcutGrid}>
          {shortcuts.map((shortcut) => (
            <Chip
              compact
              icon={shortcut.icon}
              key={shortcut.id}
              onPress={() => selectShortcut(shortcut)}
              selected={shortcut.id === shortcutDraft.id}
              style={shortcut.id === shortcutDraft.id ? styles.shortcutChipSelected : styles.shortcutChip}>
              {shortcut.label}
            </Chip>
          ))}
        </View>
        <View style={styles.shortcutEditor}>
          <FormField
            error={shortcutValidation.label}
            label="Shortcut label"
            onChangeText={(value) => updateShortcutDraft('label', value)}
            placeholder="Food"
            required
            touched
            value={shortcutDraft.label}
          />
          <FormField
            autoCapitalize="none"
            error={shortcutValidation.category}
            label="Category"
            onChangeText={(value) => updateShortcutDraft('category', value)}
            placeholder="food"
            required
            touched
            value={shortcutDraft.category}
          />
          <SegmentedButtons
            buttons={[
              { icon: 'minus-circle-outline', label: 'Expense', value: 'expense' },
              { icon: 'plus-circle-outline', label: 'Income', value: 'income' },
            ]}
            onValueChange={(value) => updateShortcutDraft('type', value as QuickAddShortcutType)}
            value={shortcutDraft.type}
          />
          <MoneyField
            error={shortcutValidation.defaultAmount}
            helper="Optional amount prefilled when this shortcut is tapped."
            label="Default amount"
            onChangeText={(value) => updateShortcutDraft('defaultAmount', value)}
            placeholder="500"
            touched={Boolean(shortcutDraft.defaultAmount)}
            value={shortcutDraft.defaultAmount}
          />
          <Text style={styles.shortcutSubhead}>Icon</Text>
          <View style={styles.iconGrid}>
            {quickAddIconOptions.map((item) => (
              <Chip
                compact
                icon={item.icon}
                key={item.icon}
                onPress={() => updateShortcutDraft('icon', item.icon)}
                selected={shortcutDraft.icon === item.icon}
                style={shortcutDraft.icon === item.icon ? styles.shortcutChipSelected : styles.shortcutChip}>
                {item.label}
              </Chip>
            ))}
          </View>
        </View>
        {shortcutFeedback ? (
          <View style={styles.successStack}>
            <SuccessPulse label="Updated" visible />
            <SuccessBanner message={shortcutFeedback} title="Shortcut saved" />
          </View>
        ) : null}
        {shortcutError ? <AppErrorState message={shortcutError} title="Shortcut needs attention" /> : null}
        <View style={styles.actionRow}>
          <Button disabled={shortcutHasErrors} icon="content-save-outline" mode="contained" onPress={saveShortcut} style={styles.actionButton}>
            Save Shortcut
          </Button>
          <Button icon="restore" mode="outlined" onPress={resetShortcuts} style={styles.actionButton}>
            Reset
          </Button>
        </View>
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
        {!preview ? (
          <EmptyState
            icon="file-import-outline"
            text="Import works best with columns for date, type, category, amount, and notes. You will preview rows before anything is saved."
            title="Bring in existing history"
          />
        ) : null}
        {feedback ? <SuccessBanner message={feedback} title="Import complete" /> : null}
        {importError ? <AppErrorState message={importError} title="Data action needs attention" /> : null}
        {preview ? (
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>Import preview</Text>
            <Text style={styles.muted}>
              {preview.valid_count} valid rows, {preview.error_count} rows need fixes.
            </Text>
            {preview.preview.slice(0, 3).map((row) => (
              <Text key={`${row.row}-${row.date}-${row.category}`} style={styles.previewRow}>
                {row.date} - {row.type} - {formatCategoryLabel(row.category)} - {row.amount}
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
      <ConfirmDialog
        confirmLabel="Sign Out"
        destructive
        message="You will need to sign in again to access this workspace."
        onCancel={() => setSignOutVisible(false)}
        onConfirm={() => {
          setSignOutVisible(false);
          void signOut();
        }}
        title="Sign out?"
        visible={signOutVisible}
      />
    </KeyboardAwareScrollView>
  );
}

function createStyles(colors: AppPalette, bottomInset = 0) {
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
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
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
    preferenceGroup: {
      gap: spacing.lg,
    },
    preferenceItem: {
      gap: spacing.sm,
    },
    preferenceLabel: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: '900',
    },
    preferenceLabelRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
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
    keyboard: {
      backgroundColor: colors.background,
      flex: 1,
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
    restoreSetupButton: {
      borderColor: colors.border,
      borderRadius: radii.card,
    },
    shortcutChip: {
      backgroundColor: colors.surface2,
      borderRadius: radii.card,
    },
    shortcutChipSelected: {
      backgroundColor: colors.skySoft,
      borderRadius: radii.card,
    },
    shortcutEditor: {
      gap: spacing.md,
    },
    shortcutGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    shortcutSubhead: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: '900',
    },
    successStack: {
      gap: spacing.sm,
    },
    screen: {
      backgroundColor: colors.background,
      flexGrow: 1,
      gap: spacing.lg,
      padding: spacing.xl,
      paddingBottom: getFloatingTabBarBottomPadding(bottomInset, 68, 180),
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
