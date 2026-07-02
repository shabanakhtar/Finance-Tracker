import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Href, router, useFocusEffect } from 'expo-router';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, IconButton, SegmentedButtons } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPalette } from '@/constants/theme';
import {
  AppErrorState,
  AnimatedCard,
  AnimatedProgressBar,
  AnimatedScreen,
  CharacterCounter,
  ConnectionNotice,
  ConfirmDialog,
  DelayedLoader,
  FormField,
  MoneyField,
  PressableScale,
  SkeletonList,
  triggerSelection,
  triggerSuccess,
  triggerWarning,
  validateAmount,
  validateCategory,
  validateDate,
  validateMaxLength,
  useConnectionStatus,
} from '@/components/ux';
import { useAuth } from '@/contexts/auth';
import { useCurrency } from '@/contexts/currency';
import { useAppTheme } from '@/contexts/theme';
import { useFloatingToast } from '@/contexts/toast';
import { formatCategoryLabel } from '@/services/formatters';
import { getQueuedTransactions, getSyncHistory, SyncHistoryItem, syncQueuedTransactions } from '@/services/offlineQueue';
import { defaultQuickAddShortcuts, getQuickAddShortcuts, QuickAddShortcut } from '@/services/quickAddShortcuts';
import { cacheDashboard, formatCachedAt, getCachedDashboard } from '@/services/resilience';
import { getSetupDismissed, setSetupDismissed as persistSetupDismissed } from '@/services/setupProgress';
import {
  BudgetStatus,
  Dashboard,
  Transaction,
  deleteBudget,
  deleteTransaction,
  getDashboard,
  saveBudget,
  updateTransaction,
} from '@/services/api';

const categoryIcons: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  food: 'food-outline',
  groceries: 'cart-outline',
  rent: 'home-city-outline',
  salary: 'cash-plus',
  shopping: 'shopping-outline',
  transport: 'bus',
  utilities: 'flash-outline',
};

type TransactionForm = {
  id?: string;
  amount: string;
  category: string;
  date: string;
  notes: string;
  type: 'income' | 'expense';
};
type HomeFocusKind = 'analysis' | 'budget' | 'expense' | 'income' | 'quickAdd' | 'sync';
type HomeFocus = {
  cta: string;
  detail: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  kind: HomeFocusKind;
  title: string;
};
type DashboardFormField = 'budgetAmount' | 'budgetCategory' | 'editAmount' | 'editCategory' | 'editDate' | 'editNotes';
const NOTES_LIMIT = 500;
const RECENT_PREVIEW_LIMIT = 4;

type DashboardTheme = {
  colors: AppPalette;
  styles: ReturnType<typeof createStyles>;
};

const DashboardThemeContext = createContext<DashboardTheme | null>(null);

function useDashboardTheme() {
  const value = useContext(DashboardThemeContext);
  if (!value) {
    throw new Error('Dashboard theme is missing');
  }
  return value;
}

export default function DashboardScreen() {
  const { session, signOut } = useAuth();
  const { formatMoney } = useCurrency();
  const { colors } = useAppTheme();
  const { showToast: showFloatingToast } = useFloatingToast();
  const connection = useConnectionStatus();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetCategory, setBudgetCategory] = useState('');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [dashboardCachedAt, setDashboardCachedAt] = useState<string | null>(null);
  const [degradedMessage, setDegradedMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<TransactionForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [quickAddShortcuts, setQuickAddShortcuts] = useState<QuickAddShortcut[]>(defaultQuickAddShortcuts);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([]);
  const [syncingQueue, setSyncingQueue] = useState(false);
  const [setupDismissed, setSetupDismissed] = useState(false);
  const [pendingBudgetDelete, setPendingBudgetDelete] = useState<string | null>(null);
  const [signOutVisible, setSignOutVisible] = useState(false);
  const [pendingTransactionDelete, setPendingTransactionDelete] = useState<Transaction | null>(null);
  const lastAutoSyncCount = useRef(0);
  const [submittedFields, setSubmittedFields] = useState<Record<DashboardFormField, boolean>>({
    budgetAmount: false,
    budgetCategory: false,
    editAmount: false,
    editCategory: false,
    editDate: false,
    editNotes: false,
  });

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      setDegradedMessage(null);
      const queued = await getQueuedTransactions();
      const history = await getSyncHistory();
      setQueuedCount(queued.length);
      setSyncHistory(history);
      const nextDashboard = await getDashboard();
      await cacheDashboard(nextDashboard);
      setDashboardCachedAt(null);
      setDashboard(nextDashboard);
    } catch (err) {
      const cached = await getCachedDashboard();
      if (cached) {
        setDashboard(cached.dashboard);
        setDashboardCachedAt(cached.cachedAt);
        setDegradedMessage(err instanceof Error ? err.message : 'Live dashboard is temporarily unavailable.');
      } else {
        setError(err instanceof Error ? err.message : 'Unable to load dashboard');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    getSetupDismissed()
      .then(setSetupDismissed)
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getQuickAddShortcuts(), getQueuedTransactions(), getSyncHistory()])
        .then(([shortcuts, queued, history]) => {
          if (!active) return;
          setQuickAddShortcuts(shortcuts);
          setQueuedCount(queued.length);
          setSyncHistory(history);
        })
        .catch(() => {
          if (active) setQuickAddShortcuts(defaultQuickAddShortcuts);
        });

      return () => {
        active = false;
      };
    }, []),
  );

  const netCashFlow = (dashboard?.summary.income ?? 0) - (dashboard?.summary.expense ?? 0);
  const setupComplete = Boolean(
    dashboard && dashboard.summary.income > 0 && dashboard.summary.expense > 0 && dashboard.budgets.length > 0,
  );
  const showSetupGuide = Boolean(dashboard && !setupComplete && !setupDismissed);
  const homeFocus = useMemo(() => (dashboard ? getHomeFocus(dashboard, queuedCount) : null), [dashboard, queuedCount]);
  const recentPreview = useMemo(() => dashboard?.recent_transactions.slice(0, RECENT_PREVIEW_LIMIT) ?? [], [dashboard?.recent_transactions]);
  const budgetAmountValidation = useMemo(() => validateAmount(budgetAmount), [budgetAmount]);
  const budgetCategoryValidation = useMemo(() => validateCategory(budgetCategory), [budgetCategory]);
  const budgetFormIsValid = budgetAmountValidation.isValid && budgetCategoryValidation.isValid;
  const editAmountValidation = useMemo(() => validateAmount(editing?.amount ?? ''), [editing?.amount]);
  const editCategoryValidation = useMemo(() => validateCategory(editing?.category ?? ''), [editing?.category]);
  const editDateValidation = useMemo(() => validateDate(editing?.date ?? ''), [editing?.date]);
  const editNotesValidation = useMemo(() => validateMaxLength(editing?.notes ?? '', NOTES_LIMIT, 'Notes'), [editing?.notes]);
  const editFormIsValid =
    Boolean(editing?.id) &&
    editAmountValidation.isValid &&
    editCategoryValidation.isValid &&
    editDateValidation.isValid &&
    editNotesValidation.isValid;
  const profileName =
    session?.user.user_metadata?.first_name ??
    session?.user.user_metadata?.full_name ??
    session?.user.user_metadata?.name ??
    'there';

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };
  const showToast = useCallback((message: string) => {
    triggerSuccess();
    showFloatingToast(message);
  }, [showFloatingToast]);
  const dismissSetup = async () => {
    setSetupDismissed(true);
    await persistSetupDismissed(true);
  };
  const primeBudgetSetup = () => {
    triggerSelection();
    setBudgetCategory((value) => value || 'food');
    showToast('Budget form is ready below. Add a monthly limit.');
  };
  const markSubmitted = (...fields: DashboardFormField[]) => {
    setSubmittedFields((current) => {
      const next = { ...current };
      fields.forEach((field) => {
        next[field] = true;
      });
      return next;
    });
  };

  const syncOfflineQueue = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      setSyncingQueue(true);
      const result = await syncQueuedTransactions();
      setSyncHistory(await getSyncHistory());
      setQueuedCount(result.remaining.length);
      if (result.synced > 0) {
        await loadDashboard();
      }
      if (!result.online) {
        if (!silent) Alert.alert('Still offline', 'Queued transactions will sync when your connection is back.');
      } else if (result.remaining.length) {
        if (!silent) Alert.alert('Partial sync', `${result.synced} synced, ${result.remaining.length} still waiting.`);
      } else if (result.synced > 0) {
        showToast(`${result.synced} offline transaction${result.synced === 1 ? '' : 's'} synced.`);
      }
    } catch (err) {
      if (!silent) Alert.alert('Sync failed', err instanceof Error ? err.message : 'Could not sync queued transactions.');
    } finally {
      setSyncingQueue(false);
    }
  }, [loadDashboard, showToast]);

  useEffect(() => {
    if (connection.isOffline) {
      lastAutoSyncCount.current = 0;
      return;
    }
    if (connection.isChecking || connection.isOffline || queuedCount <= 0 || syncingQueue) return;
    if (lastAutoSyncCount.current === queuedCount) return;
    lastAutoSyncCount.current = queuedCount;
    syncOfflineQueue({ silent: true });
  }, [connection.isChecking, connection.isOffline, queuedCount, syncOfflineQueue, syncingQueue]);

  const actOnHomeFocus = () => {
    if (!homeFocus) return;
    triggerSelection();
    if (homeFocus.kind === 'sync') {
      syncOfflineQueue();
      return;
    }
    if (homeFocus.kind === 'income') {
      router.push({ pathname: '/quick-add', params: { category: 'salary', type: 'income' } } as unknown as Href);
      return;
    }
    if (homeFocus.kind === 'expense') {
      router.push({ pathname: '/quick-add', params: { category: 'food', type: 'expense' } } as unknown as Href);
      return;
    }
    if (homeFocus.kind === 'analysis') {
      router.push('/analysis' as Href);
      return;
    }
    if (homeFocus.kind === 'budget') {
      setBudgetCategory((value) => value || 'food');
      showToast('Budget form is ready below. Add a monthly limit.');
      return;
    }
    router.push('/quick-add' as Href);
  };

  const startEdit = (item: Transaction) => {
    if (!item.id) {
      Alert.alert('Missing transaction id', 'This transaction cannot be edited because the backend did not return its id.');
      return;
    }

    setEditing({
      id: item.id,
      amount: String(item.amount),
      category: item.category,
      date: item.date,
      notes: item.notes ?? '',
      type: item.type,
    });
    setSubmittedFields((current) => ({
      ...current,
      editAmount: false,
      editCategory: false,
      editDate: false,
      editNotes: false,
    }));
  };

  const submitEdit = async () => {
    if (!editing?.id) return;
    markSubmitted('editAmount', 'editCategory', 'editDate', 'editNotes');
    const parsedAmount = Number(editing.amount);

    if (!editFormIsValid) {
      triggerWarning();
      return;
    }

    try {
      setSavingTransaction(true);
      await updateTransaction({
        id: editing.id,
        amount: parsedAmount,
        category: editing.category.trim(),
        date: editing.date,
        notes: editing.notes.trim(),
        type: editing.type,
      });
      setEditing(null);
      showToast('Transaction updated.');
      await loadDashboard();
    } catch (err) {
      Alert.alert('Could not update', err instanceof Error ? err.message : 'Backend request failed.');
    } finally {
      setSavingTransaction(false);
    }
  };

  const removeTransaction = async (item: Transaction) => {
    if (!item.id) return;
    setPendingTransactionDelete(item);
  };

  const confirmDeleteTransaction = async () => {
    const transactionId = pendingTransactionDelete?.id;
    if (!transactionId) return;
    try {
      setPendingTransactionDelete(null);
      await deleteTransaction(transactionId);
      if (editing?.id === transactionId) setEditing(null);
      showToast('Transaction deleted.');
      await loadDashboard();
    } catch (err) {
      Alert.alert('Could not delete', err instanceof Error ? err.message : 'Backend request failed.');
    }
  };

  const submitBudget = async () => {
    markSubmitted('budgetAmount', 'budgetCategory');
    const parsedAmount = Number(budgetAmount);
    if (!budgetFormIsValid) {
      triggerWarning();
      return;
    }

    try {
      setSavingBudget(true);
      await saveBudget({
        category: budgetCategory.trim(),
        limit_amount: parsedAmount,
      });
      setBudgetAmount('');
      setBudgetCategory('');
      setSubmittedFields((current) => ({
        ...current,
        budgetAmount: false,
        budgetCategory: false,
      }));
      showToast('Budget saved.');
      await loadDashboard();
    } catch (err) {
      Alert.alert('Could not save budget', err instanceof Error ? err.message : 'Backend request failed.');
    } finally {
      setSavingBudget(false);
    }
  };

  const removeBudget = async (category: string) => {
    setPendingBudgetDelete(category);
  };

  const confirmDeleteBudget = async () => {
    if (!pendingBudgetDelete) return;
    const category = pendingBudgetDelete;
    try {
      setPendingBudgetDelete(null);
      await deleteBudget(category);
      showToast('Budget deleted.');
      await loadDashboard();
    } catch (err) {
      Alert.alert('Could not delete budget', err instanceof Error ? err.message : 'Backend request failed.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingTitle}>Preparing your dashboard</Text>
        <Text style={styles.muted}>Syncing your latest transactions and saved snapshot.</Text>
        <SkeletonList count={4} />
        <DelayedLoader label="Still loading your dashboard..." longLabel="Still working. Your connection or backend may be slow." />
      </View>
    );
  }

  return (
    <DashboardThemeContext.Provider value={{ colors, styles }}>
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.sky} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <AnimatedScreen style={styles.headerCopy}>
          <Text style={styles.brand}>Finance Tracker</Text>
          <Text style={styles.title}>Welcome, {profileName}</Text>
        </AnimatedScreen>
        <IconButton
          accessibilityLabel="Sign out"
          icon="logout"
          iconColor={colors.ink}
          mode="contained-tonal"
          onPress={() => setSignOutVisible(true)}
          size={20}
        />
      </View>

      <Text style={styles.subtitle}>Here is your money snapshot for today.</Text>

      {connection.isOffline ? <ConnectionNotice message="Offline mode is on. You can keep adding transactions; they will queue on this device." /> : null}
      {error ? <ErrorState error={error} onRetry={loadDashboard} /> : null}
      {degradedMessage ? <CachedDashboardNotice cachedAt={dashboardCachedAt} message={degradedMessage} onRetry={loadDashboard} /> : null}
      {queuedCount > 0 || syncHistory.length ? (
        <OfflineQueueCard count={queuedCount} history={syncHistory} isOffline={connection.isOffline} syncing={syncingQueue} onSync={syncOfflineQueue} />
      ) : null}

      {dashboard ? (
        <>
          {showSetupGuide ? (
            <GettingStartedCard dashboard={dashboard} onPrimeBudget={primeBudgetSetup} onSkip={dismissSetup} />
          ) : null}

          <AnimatedCard index={showSetupGuide ? 1 : 0}>
            <Card style={styles.balanceCard}>
              <Card.Content>
                <View style={styles.rowBetween}>
                  <Text style={styles.balanceLabel}>Available balance</Text>
                  <View style={styles.livePill}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>Live</Text>
                  </View>
                </View>
                <Text style={styles.balanceValue}>{formatMoney(dashboard.summary.balance)}</Text>
                <Text style={styles.balanceHint}>
                  {netCashFlow >= 0 ? '+' : ''}
                  {formatMoney(netCashFlow)} net cash flow
                </Text>
                <View style={styles.metricRow}>
                  <Metric label="Income" value={formatMoney(dashboard.summary.income)} tone="income" />
                  <Metric label="Spent" value={formatMoney(dashboard.summary.expense)} tone="expense" />
                </View>
                <QuickAddStrip shortcuts={quickAddShortcuts} />
              </Card.Content>
            </Card>
          </AnimatedCard>

          {!showSetupGuide && homeFocus ? <HomeFocusCard focus={homeFocus} onPress={actOnHomeFocus} /> : null}

          <Section title="Budgets" icon="target">
            <View style={styles.formGrid}>
              <FormField
                autoCapitalize="none"
                error={budgetCategoryValidation.message}
                label="Category"
                onChangeText={setBudgetCategory}
                onBlur={() => markSubmitted('budgetCategory')}
                placeholder="food"
                required
                style={styles.input}
                touched={submittedFields.budgetCategory}
                value={budgetCategory}
              />
              <MoneyField
                error={budgetAmountValidation.message}
                label="Monthly limit"
                onChangeText={setBudgetAmount}
                onBlur={() => markSubmitted('budgetAmount')}
                placeholder="15000"
                required
                style={styles.input}
                touched={submittedFields.budgetAmount}
                value={budgetAmount}
              />
              <Button disabled={savingBudget || !budgetFormIsValid} loading={savingBudget} mode="contained" onPress={submitBudget} style={styles.primaryButton}>
                Save Budget
              </Button>
            </View>
            <View style={styles.sectionGap}>
              {dashboard.budget_status.length ? (
                dashboard.budget_status.map((item) => (
                  <BudgetRow key={item.category} item={item} onDelete={() => removeBudget(item.category)} />
                ))
              ) : (
                <EmptyState icon="wallet-plus-outline" text="Budgets help you spot overspending before the month gets away from you. Set your first limit for food, rent, transport, or shopping." />
              )}
            </View>
          </Section>

          {editing ? (
            <Section title="Edit transaction" icon="pencil-outline">
              <SegmentedButtons
                onValueChange={(value) => setEditing({ ...editing, type: value as 'income' | 'expense' })}
                value={editing.type}
                buttons={[
                  { value: 'expense', label: 'Expense', icon: 'minus-circle-outline' },
                  { value: 'income', label: 'Income', icon: 'plus-circle-outline' },
                ]}
              />
              <View style={styles.formGrid}>
                <MoneyField
                  error={editAmountValidation.message}
                  label="Amount"
                  onChangeText={(value) => setEditing({ ...editing, amount: value })}
                  required
                  style={styles.input}
                  touched={submittedFields.editAmount}
                  value={editing.amount}
                />
                <FormField
                  autoCapitalize="none"
                  error={editCategoryValidation.message}
                  label="Category"
                  onChangeText={(value) => setEditing({ ...editing, category: value })}
                  required
                  style={styles.input}
                  touched={submittedFields.editCategory}
                  value={editing.category}
                />
                <FormField
                  error={editDateValidation.message}
                  keyboardType="numbers-and-punctuation"
                  label="Date"
                  onChangeText={(value) => setEditing({ ...editing, date: value })}
                  required
                  style={styles.input}
                  touched={submittedFields.editDate}
                  value={editing.date}
                />
                <FormField
                  counter={<CharacterCounter max={NOTES_LIMIT} value={editing.notes} />}
                  error={editNotesValidation.message}
                  helper="Optional context, merchant, or reason."
                  label="Notes"
                  multiline
                  numberOfLines={2}
                  onChangeText={(value) => setEditing({ ...editing, notes: value })}
                  style={styles.input}
                  touched={submittedFields.editNotes}
                  value={editing.notes}
                />
              </View>
              <View style={styles.actionRow}>
                <Button disabled={savingTransaction} mode="outlined" onPress={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button disabled={savingTransaction} loading={savingTransaction} mode="contained" onPress={submitEdit} style={styles.primaryButton}>
                  Update
                </Button>
              </View>
            </Section>
          ) : null}

          <Section title="Recent transactions" icon="receipt-text-outline">
            {recentPreview.length ? (
              <>
              {recentPreview.map((item, index) => (
                <TransactionRow
                  key={item.id ?? `${item.date}-${item.category}-${index}`}
                  item={item}
                  onDelete={() => removeTransaction(item)}
                  onEdit={() => startEdit(item)}
                />
              ))}
              {dashboard.recent_transactions.length > RECENT_PREVIEW_LIMIT ? (
                <View style={styles.recentFooter}>
                  <Text style={styles.recentFooterText}>
                    Showing {recentPreview.length} of {dashboard.recent_transactions.length} recent entries.
                  </Text>
                  <Button compact icon="chart-timeline-variant" mode="text" onPress={() => router.push('/analysis' as Href)} textColor={colors.sky}>
                    Trends
                  </Button>
                </View>
              ) : null}
              </>
            ) : (
              <EmptyState
                actions={[
                  { label: 'Add manually', onPress: () => router.push('/explore') },
                  { label: 'Scan receipt', onPress: () => router.push('/explore') },
                  { label: 'Import CSV', onPress: () => router.push('/settings') },
                ]}
                icon="receipt-text-plus-outline"
                text="Transactions are your money history. Add income, log an expense, scan a receipt, or import a CSV to begin."
              />
            )}
          </Section>

          {dashboardCachedAt ? <Text style={styles.apiHint}>Showing saved snapshot from {formatCachedAt(dashboardCachedAt)}</Text> : null}
          <ConfirmDialog
            confirmLabel="Delete"
            destructive
            message={
              pendingTransactionDelete
                ? `${formatCategoryLabel(pendingTransactionDelete.category)} for ${formatMoney(pendingTransactionDelete.amount)} will be removed.`
                : ''
            }
            onCancel={() => setPendingTransactionDelete(null)}
            onConfirm={confirmDeleteTransaction}
            title="Delete transaction?"
            visible={Boolean(pendingTransactionDelete)}
          />
          <ConfirmDialog
            confirmLabel="Delete"
            destructive
            message={pendingBudgetDelete ? `Remove the ${formatCategoryLabel(pendingBudgetDelete)} monthly limit?` : ''}
            onCancel={() => setPendingBudgetDelete(null)}
            onConfirm={confirmDeleteBudget}
            title="Delete budget?"
            visible={Boolean(pendingBudgetDelete)}
          />
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
        </>
      ) : null}
    </ScrollView>
    </DashboardThemeContext.Provider>
  );
}

function getHomeFocus(dashboard: Dashboard, queuedCount: number): HomeFocus {
  if (queuedCount > 0) {
    return {
      cta: 'Sync now',
      detail: `${queuedCount} offline transaction${queuedCount === 1 ? '' : 's'} waiting to upload.`,
      icon: 'cloud-sync-outline',
      kind: 'sync',
      title: 'Finish syncing your latest entries',
    };
  }

  if (dashboard.summary.income <= 0) {
    return {
      cta: 'Add income',
      detail: 'Start with your salary, allowance, transfer, or any money that came in.',
      icon: 'cash-plus',
      kind: 'income',
      title: 'Add income to anchor your snapshot',
    };
  }

  if (dashboard.summary.expense <= 0) {
    return {
      cta: 'Add expense',
      detail: 'Log one real spend so your balance and budget picture starts becoming useful.',
      icon: 'receipt-text-plus-outline',
      kind: 'expense',
      title: 'Add your first expense',
    };
  }

  if (!dashboard.budgets.length) {
    return {
      cta: 'Set below',
      detail: 'A simple food, transport, or shopping limit is enough to unlock better warnings.',
      icon: 'target',
      kind: 'budget',
      title: 'Set one budget guardrail',
    };
  }

  if (dashboard.warnings.length || dashboard.opportunities.length || dashboard.insight_cards.length) {
    return {
      cta: 'Open analysis',
      detail: 'Your score, trends, warnings, and opportunities are ready in the Analysis tab.',
      icon: 'chart-timeline-variant',
      kind: 'analysis',
      title: 'Review what changed',
    };
  }

  return {
    cta: 'Quick add',
    detail: 'Keep the snapshot fresh with one small entry whenever money moves.',
    icon: 'plus-circle-outline',
    kind: 'quickAdd',
    title: 'Log today before you forget',
  };
}

type SetupStepState = 'active' | 'complete' | 'optional' | 'upcoming';

type SetupAction = {
  complete?: boolean;
  detail: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  key: string;
  label: string;
  onPress: () => void;
  state: SetupStepState;
};

function GettingStartedCard({
  dashboard,
  onPrimeBudget,
  onSkip,
}: {
  dashboard: Dashboard;
  onPrimeBudget: () => void;
  onSkip: () => void;
}) {
  const { colors, styles } = useDashboardTheme();
  const hasIncome = dashboard.summary.income > 0;
  const hasExpense = dashboard.summary.expense > 0;
  const hasBudget = dashboard.budgets.length > 0;
  const essentialSteps: SetupAction[] = [
    {
      complete: hasIncome,
      detail: 'Log your first paycheck, allowance, freelance payment, or transfer in.',
      icon: 'cash-plus',
      key: 'income',
      label: 'Add income',
      onPress: () => router.push({ pathname: '/quick-add', params: { category: 'salary', type: 'income' } } as unknown as Href),
      state: 'upcoming',
    },
    {
      complete: hasExpense,
      detail: 'Add one real spend so the app can start comparing money in and out.',
      icon: 'receipt-text-plus-outline',
      key: 'expense',
      label: 'Add expense',
      onPress: () => router.push({ pathname: '/quick-add', params: { category: 'food', type: 'expense' } } as unknown as Href),
      state: 'upcoming',
    },
    {
      complete: hasBudget,
      detail: 'Create one soft limit for a category you care about this month.',
      icon: 'target',
      key: 'budget',
      label: 'Set budget',
      onPress: onPrimeBudget,
      state: 'upcoming',
    },
  ];
  const activeIndex = essentialSteps.findIndex((step) => !step.complete);
  const setupSteps = essentialSteps.map((step, index) => ({
    ...step,
    state: step.complete ? 'complete' : index === activeIndex ? 'active' : 'upcoming',
  }));
  const completedSteps = setupSteps.filter((step) => step.complete).length;
  const progress = completedSteps / setupSteps.length;
  const nextStep = setupSteps.find((step) => step.state === 'active') ?? setupSteps[0];
  const optionalSteps: SetupAction[] = [
    {
      detail: 'Ask for a first read once the essentials are in.',
      icon: 'creation-outline',
      key: 'ai',
      label: 'Ask AI',
      onPress: () => router.push('/ai'),
      state: 'optional',
    },
    {
      detail: 'Bring existing history from a CSV backup.',
      icon: 'file-import-outline',
      key: 'csv',
      label: 'Import CSV',
      onPress: () => router.push('/settings'),
      state: 'optional',
    },
    {
      detail: 'Tune the Home shortcut tiles in Settings.',
      icon: 'tune-variant',
      key: 'quick-add',
      label: 'Plan shortcuts',
      onPress: () => router.push('/settings' as Href),
      state: 'optional',
    },
  ];

  return (
    <AnimatedCard index={2}>
    <Card style={styles.startCard}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons color={colors.sky} name="map-marker-path" size={20} />
          <Text style={styles.cardTitle}>Set up your money snapshot</Text>
        </View>
        <Text style={styles.startText}>
          Add the three essentials once. After that, Home becomes your daily dashboard with balance, trends, and quick actions.
        </Text>
        <PressableScale accessibilityRole="button" onPress={nextStep.onPress} style={styles.setupNextStep}>
          <View style={styles.setupNextIcon}>
            <MaterialCommunityIcons color={colors.sky} name={nextStep.icon} size={22} />
          </View>
          <View style={styles.setupNextText}>
            <Text style={styles.setupNextEyebrow}>Active step</Text>
            <Text style={styles.setupNextTitle}>{nextStep.label}</Text>
            <Text style={styles.setupNextDetail}>{nextStep.detail}</Text>
          </View>
          <MaterialCommunityIcons color={colors.sky} name="chevron-right" size={22} />
        </PressableScale>
        <View style={styles.setupProgressHeader}>
          <Text style={styles.setupProgressText}>{completedSteps} of {setupSteps.length} essentials done</Text>
          <Text style={styles.setupProgressText}>{Math.round(progress * 100)}%</Text>
        </View>
        <AnimatedProgressBar color={colors.sky} progress={progress} trackColor={colors.surface2} />
        <View style={styles.setupStepRow}>
          {setupSteps.map((step) => (
            <PressableScale
              key={step.key}
              accessibilityRole="button"
              onPress={step.onPress}
              style={[
                styles.setupStepTile,
                step.state === 'active' ? styles.setupStepTileActive : null,
                step.state === 'complete' ? styles.setupStepTileDone : null,
              ]}>
              <MaterialCommunityIcons
                color={step.state === 'complete' ? colors.emerald : step.state === 'active' ? colors.sky : colors.muted}
                name={step.state === 'complete' ? 'check-circle-outline' : step.icon}
                size={18}
              />
              <Text style={styles.setupStepLabel}>{step.label}</Text>
              <Text style={styles.setupStepState}>{step.state === 'complete' ? 'Done' : step.state === 'active' ? 'Now' : 'Next'}</Text>
            </PressableScale>
          ))}
        </View>
        <Text style={styles.setupOptionalTitle}>Optional setup</Text>
        <View style={styles.startSteps}>
          {optionalSteps.map((step) => (
            <StepBadge key={step.key} icon={step.icon} onPress={step.onPress} state={step.state} text={step.label} />
          ))}
        </View>
        <Button compact mode="text" onPress={onSkip} style={styles.skipSetupButton} textColor={colors.muted}>
          Skip for now
        </Button>
      </Card.Content>
    </Card>
    </AnimatedCard>
  );
}

function HomeFocusCard({ focus, onPress }: { focus: HomeFocus; onPress: () => void }) {
  const { colors, styles } = useDashboardTheme();

  return (
    <AnimatedCard index={1}>
      <PressableScale accessibilityRole="button" onPress={onPress} style={styles.focusCard}>
        <View style={styles.focusIcon}>
          <MaterialCommunityIcons color={colors.sky} name={focus.icon} size={22} />
        </View>
        <View style={styles.focusText}>
          <Text style={styles.focusEyebrow}>Today</Text>
          <Text style={styles.focusTitle}>{focus.title}</Text>
          <Text style={styles.focusDetail}>{focus.detail}</Text>
        </View>
        <View style={styles.focusCta}>
          <Text style={styles.focusCtaText}>{focus.cta}</Text>
          <MaterialCommunityIcons color={colors.sky} name="chevron-right" size={18} />
        </View>
      </PressableScale>
    </AnimatedCard>
  );
}

function StepBadge({
  icon,
  onPress,
  state = 'upcoming',
  text,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress?: () => void;
  state?: SetupStepState;
  text: string;
}) {
  const { colors, styles } = useDashboardTheme();
  const complete = state === 'complete';
  const content = (
    <>
      <MaterialCommunityIcons color={complete ? colors.emerald : state === 'optional' ? colors.violet : colors.sky} name={complete ? 'check-circle-outline' : icon} size={16} />
      <Text style={styles.stepText}>{text}</Text>
    </>
  );

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[styles.stepBadge, complete ? styles.stepBadgeComplete : null, state === 'optional' ? styles.stepBadgeOptional : null]}>
        {content}
      </PressableScale>
    );
  }

  return (
    <View style={[styles.stepBadge, complete ? styles.stepBadgeComplete : null, state === 'optional' ? styles.stepBadgeOptional : null]}>
      {content}
    </View>
  );
}

function QuickAddStrip({ shortcuts }: { shortcuts: QuickAddShortcut[] }) {
  const { colors, styles } = useDashboardTheme();
  const { formatMoney } = useCurrency();
  const openQuickAdd = (shortcut: QuickAddShortcut) => {
    router.push({
      pathname: '/quick-add',
      params: {
        amount: shortcut.defaultAmount ? String(shortcut.defaultAmount) : undefined,
        category: shortcut.category,
        type: shortcut.type,
      },
    } as unknown as Href);
  };

  return (
    <View style={styles.quickAddPanel}>
      <View style={styles.rowBetween}>
        <Text style={styles.quickAddTitle}>Quick add</Text>
        <PressableScale onPress={() => router.push('/explore')}>
          <Text style={styles.quickAddLink}>Open full form</Text>
        </PressableScale>
      </View>
      <View style={styles.quickAddRow}>
        {shortcuts.map((item) => (
          <PressableScale
            key={item.id}
            onPress={() => {
              triggerSelection();
              openQuickAdd(item);
            }}
            style={styles.quickAddButton}>
            <MaterialCommunityIcons color={colors.sky} name={item.icon} size={18} />
            <Text style={styles.quickAddButtonText}>{item.label}</Text>
            {item.defaultAmount ? <Text style={styles.quickAddAmount}>{formatMoney(item.defaultAmount)}</Text> : null}
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

function Section({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
}) {
  const { colors, styles } = useDashboardTheme();

  return (
    <AnimatedCard>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons color={colors.sky} name={icon} size={20} />
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          {children}
        </Card.Content>
      </Card>
    </AnimatedCard>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'income' | 'expense' }) {
  const { styles } = useDashboardTheme();

  return (
    <View style={[styles.metric, tone === 'income' ? styles.metricIncome : styles.metricExpense]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function TransactionRow({ item, onDelete, onEdit }: { item: Transaction; onDelete: () => void; onEdit: () => void }) {
  const { colors, styles } = useDashboardTheme();
  const { formatMoney } = useCurrency();
  const icon = categoryIcons[item.category.toLowerCase()] ?? (item.type === 'income' ? 'cash-plus' : 'cash-minus');
  return (
    <View style={styles.transactionRow}>
      <View style={[styles.transactionIcon, item.type === 'income' ? styles.incomeIcon : styles.expenseIcon]}>
        <MaterialCommunityIcons color={item.type === 'income' ? colors.emerald : colors.coral} name={icon} size={20} />
      </View>
      <View style={styles.transactionText}>
        <Text style={styles.listLabel}>{formatCategoryLabel(item.category)}</Text>
        <Text style={styles.muted}>{item.date}</Text>
      </View>
      <Text style={item.type === 'income' ? styles.income : styles.expense}>
        {item.type === 'income' ? '+' : '-'}
        {formatMoney(item.amount)}
      </Text>
      <View style={styles.rowActions}>
        <IconButton icon="pencil-outline" iconColor={colors.sky} onPress={onEdit} size={18} />
        <IconButton icon="trash-can-outline" iconColor={colors.coral} onPress={onDelete} size={18} />
      </View>
    </View>
  );
}

function BudgetRow({ item, onDelete }: { item: BudgetStatus; onDelete: () => void }) {
  const { colors, styles } = useDashboardTheme();
  const { formatMoney } = useCurrency();

  return (
    <View style={styles.budgetRow}>
      <View style={styles.rowBetween}>
        <Text style={styles.listLabel}>{formatCategoryLabel(item.category)}</Text>
        <Text style={item.is_over ? styles.expense : styles.listValue}>
          {formatMoney(item.spent)} / {formatMoney(item.limit_amount)}
        </Text>
      </View>
      <AnimatedProgressBar progress={item.progress} color={item.is_over ? colors.coral : colors.emerald} />
      <View style={styles.rowBetween}>
        <Text style={styles.muted}>
          {item.is_over ? `${formatMoney(Math.abs(item.remaining))} over` : `${formatMoney(item.remaining)} left`}
        </Text>
        <TouchableOpacity onPress={onDelete}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptyState({
  actions,
  icon,
  text,
}: {
  actions?: { label: string; onPress: () => void }[];
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  text: string;
}) {
  const { colors, styles } = useDashboardTheme();

  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons color={colors.muted} name={icon} size={24} />
      <Text style={styles.muted}>{text}</Text>
      {actions?.length ? (
        <View style={styles.emptyActionRow}>
          {actions.map((action) => (
            <Button compact key={action.label} mode="contained-tonal" onPress={action.onPress} style={styles.emptyActionButton}>
              {action.label}
            </Button>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <AppErrorState
      actionLabel="Retry"
      message={error}
      onAction={onRetry}
      title="Could not load your dashboard"
    />
  );
}

function CachedDashboardNotice({
  cachedAt,
  message,
  onRetry,
}: {
  cachedAt: string | null;
  message: string;
  onRetry: () => void;
}) {
  const { colors, styles } = useDashboardTheme();

  return (
    <Card style={styles.degradedCard}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons color={colors.amber} name="cloud-alert-outline" size={22} />
          <Text style={styles.cardTitle}>Live update is delayed</Text>
        </View>
        <Text style={styles.muted}>
          Showing your saved dashboard{cachedAt ? ` from ${formatCachedAt(cachedAt)}` : ''}. Core tracking still works, and
          new transactions can be saved offline if needed.
        </Text>
        <Text style={styles.degradedDetail}>{message}</Text>
        <Button mode="contained-tonal" onPress={onRetry} style={styles.degradedButton}>
          Retry live dashboard
        </Button>
      </Card.Content>
    </Card>
  );
}

function OfflineQueueCard({
  count,
  history,
  isOffline,
  onSync,
  syncing,
}: {
  count: number;
  history: SyncHistoryItem[];
  isOffline: boolean;
  onSync: () => void;
  syncing: boolean;
}) {
  const { colors, styles } = useDashboardTheme();
  const latestHistory = history.slice(0, 3);

  return (
    <Card style={styles.offlineCard}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons color={colors.amber} name="cloud-sync-outline" size={22} />
          <Text style={styles.cardTitle}>
            {count > 0 ? `${count} offline transaction${count === 1 ? '' : 's'} waiting` : 'Offline sync history'}
          </Text>
        </View>
        <Text style={styles.muted}>
          {count > 0
            ? isOffline
              ? 'These are safe on this device. Sync will resume when internet is reachable.'
              : 'These were saved on this device and will be uploaded once the API is reachable.'
            : 'Recent offline sync activity is shown here so you know what happened.'}
        </Text>
        {latestHistory.length ? (
          <View style={styles.syncHistoryList}>
            {latestHistory.map((item) => (
              <View key={`${item.at}-${item.message}`} style={styles.syncHistoryRow}>
                <MaterialCommunityIcons
                  color={item.status === 'success' ? colors.emerald : item.status === 'failed' ? colors.coral : colors.amber}
                  name={item.status === 'success' ? 'check-circle-outline' : item.status === 'failed' ? 'alert-circle-outline' : 'clock-outline'}
                  size={16}
                />
                <View style={styles.syncHistoryText}>
                  <Text style={styles.syncHistoryMessage}>{item.message}</Text>
                  <Text style={styles.syncHistoryTime}>{formatCachedAt(item.at)}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
        {count > 0 ? (
          <Button disabled={isOffline || syncing} loading={syncing} mode="contained" onPress={() => onSync()} style={styles.offlineButton}>
            {isOffline ? 'Waiting for internet' : 'Sync now'}
          </Button>
        ) : null}
      </Card.Content>
    </Card>
  );
}

function createStyles(colors: AppPalette, bottomInset = 0) {
  return StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  apiHint: {
    color: colors.muted2,
    fontSize: 11,
    textAlign: 'center',
  },
  balanceCard: {
    backgroundColor: colors.balanceSurface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
  },
  balanceHint: {
    color: colors.balanceMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  balanceLabel: {
    color: colors.balanceMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  balanceValue: {
    color: colors.balanceText,
    fontSize: 38,
    fontWeight: '900',
    marginTop: 8,
  },
  barColumn: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
    height: 90,
    justifyContent: 'center',
  },
  brand: {
    color: colors.sky,
    fontSize: 14,
    fontWeight: '800',
  },
  breakdownRow: {
    gap: 8,
    marginBottom: 14,
  },
  budgetRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 8,
    paddingTop: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  loadingScreen: {
    backgroundColor: colors.background,
    flex: 1,
    gap: 16,
    justifyContent: 'flex-start',
    padding: 20,
    paddingTop: 72,
  },
  chartPanel: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  chip: {
    backgroundColor: colors.violetSoft,
    borderRadius: 8,
  },
  chipText: {
    color: colors.ink,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  container: {
    backgroundColor: colors.background,
    gap: 16,
    padding: 20,
    paddingBottom: Math.max(172, bottomInset + 156),
  },
  deleteText: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: '800',
  },
  degradedButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    marginTop: 12,
  },
  degradedCard: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
  },
  degradedDetail: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  emptyActionButton: {
    borderRadius: 8,
  },
  emptyActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 6,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  errorButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.coral,
    borderRadius: 8,
    marginTop: 12,
  },
  errorCard: {
    backgroundColor: colors.coralSoft,
    borderRadius: 8,
  },
  errorText: {
    color: '#7f1d1d',
    marginTop: 6,
  },
  errorTitle: {
    color: '#991b1b',
    fontSize: 18,
    fontWeight: '800',
  },
  expense: {
    color: colors.coral,
    fontSize: 14,
    fontWeight: '900',
  },
  expenseBar: {
    backgroundColor: colors.coral,
    borderRadius: 999,
    minHeight: 8,
    width: 12,
  },
  expenseIcon: {
    backgroundColor: colors.coralSoft,
  },
  formGrid: {
    gap: 10,
  },
  focusCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  focusCta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  focusCtaText: {
    color: colors.sky,
    fontSize: 12,
    fontWeight: '900',
  },
  focusDetail: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  focusEyebrow: {
    color: colors.sky,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  focusIcon: {
    alignItems: 'center',
    backgroundColor: colors.skySoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  focusText: {
    flex: 1,
  },
  focusTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 10,
  },
  income: {
    color: colors.emerald,
    fontSize: 14,
    fontWeight: '900',
  },
  incomeBar: {
    backgroundColor: colors.emerald,
    borderRadius: 999,
    minHeight: 8,
    width: 12,
  },
  incomeIcon: {
    backgroundColor: colors.emeraldSoft,
  },
  insightAction: {
    color: colors.sky,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },
  insightCard: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  insightCardList: {
    gap: 10,
    marginBottom: 12,
  },
  insightDetail: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  insightHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  insightTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  introDot: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  introDotActive: {
    backgroundColor: colors.sky,
    width: 22,
  },
  introDots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  introMotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  introTile: {
    alignItems: 'center',
    backgroundColor: colors.skySoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '48%',
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    padding: 10,
  },
  introTileText: {
    color: colors.ink,
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  input: {
    backgroundColor: colors.surface,
  },
  listLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  listValue: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  liveDot: {
    backgroundColor: colors.emerald,
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  livePill: {
    alignItems: 'center',
    backgroundColor: colors.balancePill,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveText: {
    color: colors.balancePillText,
    fontSize: 12,
    fontWeight: '800',
  },
  loadingMark: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  loadingTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  metric: {
    borderRadius: 8,
    flex: 1,
    gap: 4,
    padding: 12,
  },
  metricExpense: {
    backgroundColor: '#39201e',
  },
  metricIncome: {
    backgroundColor: '#17372d',
  },
  metricLabel: {
    color: colors.balanceMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  metricValue: {
    color: colors.balanceText,
    fontSize: 17,
    fontWeight: '900',
  },
  monthCol: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  monthLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  quickAddButton: {
    alignItems: 'center',
    backgroundColor: colors.balancePill,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    minHeight: 66,
    justifyContent: 'center',
    padding: 8,
  },
  quickAddButtonText: {
    color: colors.balanceText,
    fontSize: 12,
    fontWeight: '800',
  },
  quickAddAmount: {
    color: colors.balanceMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  quickAddLink: {
    color: colors.sky,
    fontSize: 12,
    fontWeight: '900',
  },
  quickAddPanel: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAddTitle: {
    color: colors.balanceText,
    fontSize: 14,
    fontWeight: '900',
  },
  recentFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  recentFooterText: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  opportunityDetail: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  opportunityIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  opportunityImpact: {
    color: colors.sky,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
  },
  opportunityList: {
    gap: 10,
  },
  opportunityRow: {
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  opportunityText: {
    flex: 1,
  },
  offlineButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.amber,
    borderRadius: 8,
    marginTop: 12,
  },
  offlineCard: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: colors.sky,
    borderRadius: 8,
  },
  progress: {
    borderRadius: 999,
    height: 9,
  },
  rowActions: {
    flexDirection: 'row',
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  scoreCircle: {
    alignItems: 'center',
    backgroundColor: colors.skySoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  scoreMax: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  scoreText: {
    flex: 1,
    gap: 8,
  },
  scoreValue: {
    color: colors.sky,
    fontSize: 24,
    fontWeight: '900',
  },
  sectionGap: {
    gap: 12,
    marginTop: 14,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  skipSetupButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  setupProgressFill: {
    backgroundColor: colors.sky,
    borderRadius: 999,
    height: '100%',
  },
  setupProgressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  setupProgressText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  setupProgressTrack: {
    backgroundColor: colors.surface2,
    borderRadius: 999,
    height: 9,
    marginBottom: 12,
    overflow: 'hidden',
  },
  setupNextDetail: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  setupNextEyebrow: {
    color: colors.sky,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  setupNextIcon: {
    alignItems: 'center',
    backgroundColor: colors.skySoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  setupNextStep: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.sky,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    padding: 12,
  },
  setupNextText: {
    flex: 1,
    gap: 3,
  },
  setupNextTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  setupOptionalTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  setupStepLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  setupStepRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  setupStepTile: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 5,
    minHeight: 62,
    justifyContent: 'center',
    padding: 8,
  },
  setupStepTileActive: {
    backgroundColor: colors.skySoft,
    borderColor: colors.sky,
  },
  setupStepTileDone: {
    backgroundColor: colors.emeraldSoft,
  },
  setupStepState: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
  },
  startCard: {
    backgroundColor: colors.surface,
    borderColor: colors.sky,
    borderRadius: 8,
    borderWidth: 1,
  },
  startSteps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  startText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  stepBadge: {
    alignItems: 'center',
    backgroundColor: colors.skySoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  stepBadgeComplete: {
    backgroundColor: colors.emeraldSoft,
  },
  stepBadgeOptional: {
    backgroundColor: colors.surface2,
  },
  stepText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: -10,
  },
  syncHistoryList: {
    gap: 8,
    marginTop: 12,
  },
  syncHistoryMessage: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  syncHistoryRow: {
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  syncHistoryText: {
    flex: 1,
  },
  syncHistoryTime: {
    color: colors.muted2,
    fontSize: 11,
    marginTop: 2,
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
  },
  transactionIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  transactionRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
  },
  transactionText: {
    flex: 1,
  },
  });
}
