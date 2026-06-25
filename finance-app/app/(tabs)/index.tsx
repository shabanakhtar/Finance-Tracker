import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Chip, IconButton, ProgressBar, SegmentedButtons } from 'react-native-paper';

import { AppPalette } from '@/constants/theme';
import {
  AppErrorState,
  CharacterCounter,
  DelayedLoader,
  FormField,
  SkeletonList,
  validateAmount,
  validateCategory,
  validateDate,
  validateMaxLength,
} from '@/components/ux';
import { useAuth } from '@/contexts/auth';
import { useAppTheme } from '@/contexts/theme';
import { getQueuedTransactions, syncQueuedTransactions } from '@/services/offlineQueue';
import {
  API_BASE_URL,
  BudgetStatus,
  Dashboard,
  Opportunity,
  InsightCard,
  Transaction,
  deleteBudget,
  deleteTransaction,
  getDashboard,
  saveBudget,
  updateTransaction,
} from '@/services/api';

const money = new Intl.NumberFormat('en-PK', {
  maximumFractionDigits: 0,
  style: 'currency',
  currency: 'PKR',
});

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
type DashboardFormField = 'budgetAmount' | 'budgetCategory' | 'editAmount' | 'editCategory' | 'editDate' | 'editNotes';
const NOTES_LIMIT = 500;

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
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetCategory, setBudgetCategory] = useState('');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [editing, setEditing] = useState<TransactionForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [syncingQueue, setSyncingQueue] = useState(false);
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
      const queued = await getQueuedTransactions();
      setQueuedCount(queued.length);
      const nextDashboard = await getDashboard();
      setDashboard(nextDashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const scoreProgress = useMemo(() => Math.max(0, Math.min((dashboard?.financial_score ?? 0) / 100, 1)), [
    dashboard?.financial_score,
  ]);

  const monthlyRows = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard.monthly)
      .sort(([left], [right]) => right.localeCompare(left))
      .slice(0, 6)
      .reverse();
  }, [dashboard]);

  const maxMonthlyValue = useMemo(() => {
    if (!dashboard) return 1;
    return Math.max(1, ...Object.values(dashboard.monthly).flatMap((item) => [item.income, item.expense]));
  }, [dashboard]);

  const isEmptyAccount = (dashboard?.transaction_count ?? 0) === 0;
  const netCashFlow = (dashboard?.summary.income ?? 0) - (dashboard?.summary.expense ?? 0);
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
  const markSubmitted = (...fields: DashboardFormField[]) => {
    setSubmittedFields((current) => {
      const next = { ...current };
      fields.forEach((field) => {
        next[field] = true;
      });
      return next;
    });
  };

  const syncOfflineQueue = async () => {
    try {
      setSyncingQueue(true);
      const result = await syncQueuedTransactions();
      setQueuedCount(result.remaining.length);
      if (result.synced > 0) {
        await loadDashboard();
      }
      if (!result.online) {
        Alert.alert('Still offline', 'Queued transactions will sync when your connection is back.');
      } else if (result.remaining.length) {
        Alert.alert('Partial sync', `${result.synced} synced, ${result.remaining.length} still waiting.`);
      }
    } catch (err) {
      Alert.alert('Sync failed', err instanceof Error ? err.message : 'Could not sync queued transactions.');
    } finally {
      setSyncingQueue(false);
    }
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
      await loadDashboard();
    } catch (err) {
      Alert.alert('Could not update', err instanceof Error ? err.message : 'Backend request failed.');
    } finally {
      setSavingTransaction(false);
    }
  };

  const removeTransaction = async (item: Transaction) => {
    if (!item.id) return;
    Alert.alert('Delete transaction?', `${item.category} for ${money.format(item.amount)} will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTransaction(item.id!);
            if (editing?.id === item.id) setEditing(null);
            await loadDashboard();
          } catch (err) {
            Alert.alert('Could not delete', err instanceof Error ? err.message : 'Backend request failed.');
          }
        },
      },
    ]);
  };

  const submitBudget = async () => {
    markSubmitted('budgetAmount', 'budgetCategory');
    const parsedAmount = Number(budgetAmount);
    if (!budgetFormIsValid) {
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
      await loadDashboard();
    } catch (err) {
      Alert.alert('Could not save budget', err instanceof Error ? err.message : 'Backend request failed.');
    } finally {
      setSavingBudget(false);
    }
  };

  const removeBudget = async (category: string) => {
    Alert.alert('Delete budget?', `Remove the ${category} monthly limit?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBudget(category);
            await loadDashboard();
          } catch (err) {
            Alert.alert('Could not delete budget', err instanceof Error ? err.message : 'Backend request failed.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingTitle}>Preparing your dashboard</Text>
        <Text style={styles.muted}>Syncing Vercel, Supabase, and your latest transactions.</Text>
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
        <View>
          <Text style={styles.brand}>Finance Tracker</Text>
          <Text style={styles.title}>Welcome, {profileName}</Text>
        </View>
        <IconButton icon="logout" iconColor={colors.ink} mode="contained-tonal" onPress={signOut} size={20} />
      </View>

      <Text style={styles.subtitle}>Here is your money snapshot for today.</Text>

      {error ? <ErrorState error={error} onRetry={loadDashboard} /> : null}
      {queuedCount > 0 ? <OfflineQueueCard count={queuedCount} syncing={syncingQueue} onSync={syncOfflineQueue} /> : null}

      {dashboard ? (
        <>
          <Card style={styles.balanceCard}>
            <Card.Content>
              <View style={styles.rowBetween}>
                <Text style={styles.balanceLabel}>Available balance</Text>
                <View style={styles.livePill}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Live</Text>
                </View>
              </View>
              <Text style={styles.balanceValue}>{money.format(dashboard.summary.balance)}</Text>
              <Text style={styles.balanceHint}>
                {netCashFlow >= 0 ? '+' : ''}
                {money.format(netCashFlow)} net cash flow
              </Text>
              <View style={styles.metricRow}>
                <Metric label="Income" value={money.format(dashboard.summary.income)} tone="income" />
                <Metric label="Spent" value={money.format(dashboard.summary.expense)} tone="expense" />
              </View>
              <QuickAddStrip />
            </Card.Content>
          </Card>

          {isEmptyAccount ? <GettingStartedCard dashboard={dashboard} /> : null}

          <View style={styles.scoreCard}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>{dashboard.financial_score}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
            <View style={styles.scoreText}>
              <Text style={styles.cardTitle}>Financial score</Text>
              <ProgressBar progress={scoreProgress} color={colors.emerald} style={styles.progress} />
              <Text style={styles.muted}>{dashboard.transaction_count} transactions analyzed</Text>
            </View>
          </View>

          <Section title="Opportunities" icon="creation-outline">
            {dashboard.opportunities?.length ? (
              <View style={styles.opportunityList}>
                {dashboard.opportunities.map((item, index) => (
                  <OpportunityRow item={item} key={`${item.kind}-${index}`} />
                ))}
              </View>
            ) : (
              <EmptyState icon="magnify-scan" text="Opportunities highlight recurring bills, unusual spending, and places where a cheaper choice may help. Add a few transactions to unlock them." />
            )}
          </Section>

          <Section title="Monthly cash flow" icon="chart-bar">
            {monthlyRows.length ? (
              <View style={styles.chartPanel}>
                {monthlyRows.map(([month, value]) => (
                  <View key={month} style={styles.monthCol}>
                    <View style={styles.barColumn}>
                      <View style={[styles.incomeBar, { height: `${Math.max(8, (value.income / maxMonthlyValue) * 100)}%` }]} />
                      <View style={[styles.expenseBar, { height: `${Math.max(8, (value.expense / maxMonthlyValue) * 100)}%` }]} />
                    </View>
                    <Text style={styles.monthLabel}>{month.slice(5)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState icon="chart-line" text="Monthly trends compare income and spending over time. Add income and expenses to see your cash-flow pattern." />
            )}
          </Section>

          <Section title="Budgets" icon="target">
            <View style={styles.formGrid}>
              <FormField
                autoCapitalize="none"
                error={budgetCategoryValidation.message}
                label="Category"
                onChangeText={setBudgetCategory}
                placeholder="food"
                required
                style={styles.input}
                touched={submittedFields.budgetCategory}
                value={budgetCategory}
              />
              <FormField
                error={budgetAmountValidation.message}
                keyboardType="decimal-pad"
                label="Monthly limit"
                onChangeText={setBudgetAmount}
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
                <FormField
                  error={editAmountValidation.message}
                  keyboardType="decimal-pad"
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
                <Button disabled={savingTransaction || !editFormIsValid} loading={savingTransaction} mode="contained" onPress={submitEdit} style={styles.primaryButton}>
                  Update
                </Button>
              </View>
            </Section>
          ) : null}

          <Section title="Recent transactions" icon="receipt-text-outline">
            {dashboard.recent_transactions.length ? (
              dashboard.recent_transactions.map((item, index) => (
                <TransactionRow
                  key={item.id ?? `${item.date}-${item.category}-${index}`}
                  item={item}
                  onDelete={() => removeTransaction(item)}
                  onEdit={() => startEdit(item)}
                />
              ))
            ) : (
              <EmptyState icon="receipt-text-plus-outline" text="Transactions are your money history. Add income, log an expense, scan a receipt, or import a CSV to begin." />
            )}
          </Section>

          <Section title="Spending mix" icon="chart-donut">
            {Object.keys(dashboard.breakdown).length ? (
              Object.entries(dashboard.breakdown).map(([category, percent]) => (
                <View key={category} style={styles.breakdownRow}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.listLabel}>{category}</Text>
                    <Text style={styles.listValue}>{percent.toFixed(1)}%</Text>
                  </View>
                  <ProgressBar progress={Math.min(percent / 100, 1)} color={colors.sky} style={styles.progress} />
                </View>
              ))
            ) : (
              <EmptyState icon="chart-pie" text="Spending mix shows where your money goes by category. Expense categories will appear after your first spending entries." />
            )}
          </Section>

          <Section title="Smart insights" icon="lightbulb-on-outline">
            {dashboard.insight_cards?.length ? (
              <View style={styles.insightCardList}>
                {dashboard.insight_cards.map((item) => (
                  <InsightCardRow item={item} key={`${item.kind}-${item.title}`} />
                ))}
              </View>
            ) : null}
            <View style={styles.chipWrap}>
              {[...dashboard.warnings, ...dashboard.insights].slice(0, 8).map((item, index) => (
                <Chip key={`${item}-${index}`} compact style={styles.chip} textStyle={styles.chipText}>
                  {item}
                </Chip>
              ))}
              {!dashboard.warnings.length && !dashboard.insights.length ? (
                <EmptyState icon="creation-outline" text="AI insights become more useful once the app has income, expenses, and budgets to compare." />
              ) : null}
            </View>
          </Section>

          <Text style={styles.apiHint}>Connected to {API_BASE_URL.replace('https://', '')}</Text>
        </>
      ) : null}
    </ScrollView>
    </DashboardThemeContext.Provider>
  );
}

function GettingStartedCard({ dashboard }: { dashboard: Dashboard }) {
  const { colors, styles } = useDashboardTheme();
  const hasIncome = dashboard.summary.income > 0;
  const hasExpense = dashboard.summary.expense > 0;
  const hasBudget = dashboard.budgets.length > 0;

  return (
    <Card style={styles.startCard}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons color={colors.sky} name="map-marker-path" size={20} />
          <Text style={styles.cardTitle}>Build your first money snapshot</Text>
        </View>
        <Text style={styles.startText}>
          Complete these first steps and the dashboard, budgets, and AI assistant will start giving useful feedback.
        </Text>
        <View style={styles.startSteps}>
          <StepBadge
            complete={hasIncome}
            icon="cash-plus"
            onPress={() => router.push({ pathname: '/quick-add', params: { category: 'salary', type: 'income' } } as unknown as Href)}
            text="Add income"
          />
          <StepBadge
            complete={hasExpense}
            icon="receipt-text-plus-outline"
            onPress={() => router.push({ pathname: '/quick-add', params: { category: 'food', type: 'expense' } } as unknown as Href)}
            text="Add expense"
          />
          <StepBadge complete={hasBudget} icon="target" text="Set budget below" />
          <StepBadge icon="creation-outline" onPress={() => router.push('/ai')} text="Ask AI" />
          <StepBadge icon="file-import-outline" onPress={() => router.push('/settings')} text="Import CSV" />
        </View>
      </Card.Content>
    </Card>
  );
}

function InsightCardRow({ item }: { item: InsightCard }) {
  const { colors, styles } = useDashboardTheme();
  const tone =
    item.severity === 'high'
      ? { color: colors.coral, icon: 'alert-circle-outline' as const, surface: colors.coralSoft }
      : item.severity === 'positive'
        ? { color: colors.emerald, icon: 'check-decagram-outline' as const, surface: colors.emeraldSoft }
        : item.severity === 'medium'
          ? { color: colors.amber, icon: 'lightning-bolt-outline' as const, surface: colors.warningSoft }
          : { color: colors.sky, icon: 'information-outline' as const, surface: colors.skySoft };

  return (
    <View style={[styles.insightCard, { backgroundColor: tone.surface }]}>
      <View style={styles.insightHeader}>
        <MaterialCommunityIcons color={tone.color} name={tone.icon} size={20} />
        <Text style={styles.insightTitle}>{item.title}</Text>
      </View>
      <Text style={styles.insightDetail}>{item.detail}</Text>
      <Text style={styles.insightAction}>{item.action}</Text>
    </View>
  );
}

function StepBadge({
  complete = false,
  icon,
  onPress,
  text,
}: {
  complete?: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress?: () => void;
  text: string;
}) {
  const { colors, styles } = useDashboardTheme();
  const content = (
    <>
      <MaterialCommunityIcons color={complete ? colors.emerald : colors.sky} name={complete ? 'check-circle-outline' : icon} size={16} />
      <Text style={styles.stepText}>{text}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={[styles.stepBadge, complete ? styles.stepBadgeComplete : null]}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.stepBadge, complete ? styles.stepBadgeComplete : null]}>
      {content}
    </View>
  );
}

function QuickAddStrip() {
  const { colors, styles } = useDashboardTheme();
  const shortcuts = [
    { category: 'food', icon: 'food-outline', label: 'Food', type: 'expense' },
    { category: 'transport', icon: 'bus', label: 'Ride', type: 'expense' },
    { category: 'shopping', icon: 'shopping-outline', label: 'Shop', type: 'expense' },
    { category: 'salary', icon: 'cash-plus', label: 'Income', type: 'income' },
  ] as const;
  const openQuickAdd = (category: string, type: 'income' | 'expense') => {
    router.push({ pathname: '/quick-add', params: { category, type } } as unknown as Href);
  };

  return (
    <View style={styles.quickAddPanel}>
      <View style={styles.rowBetween}>
        <Text style={styles.quickAddTitle}>Quick add</Text>
        <TouchableOpacity onPress={() => router.push('/explore')}>
          <Text style={styles.quickAddLink}>Open full form</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.quickAddRow}>
        {shortcuts.map((item) => (
          <TouchableOpacity
            key={item.category}
            onPress={() => openQuickAdd(item.category, item.type)}
            style={styles.quickAddButton}>
            <MaterialCommunityIcons color={colors.sky} name={item.icon} size={18} />
            <Text style={styles.quickAddButtonText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function OpportunityRow({ item }: { item: Opportunity }) {
  const { colors, styles } = useDashboardTheme();
  const icon =
    item.kind === 'recurring' ? 'repeat' : item.kind === 'anomaly' ? 'alert-decagram-outline' : 'tag-search-outline';
  const color = item.kind === 'anomaly' ? colors.coral : item.kind === 'recurring' ? colors.violet : colors.sky;

  return (
    <View style={styles.opportunityRow}>
      <View style={[styles.opportunityIcon, { backgroundColor: item.kind === 'anomaly' ? colors.coralSoft : colors.skySoft }]}>
        <MaterialCommunityIcons color={color} name={icon} size={20} />
      </View>
      <View style={styles.opportunityText}>
        <Text style={styles.listLabel}>{item.title}</Text>
        <Text style={styles.opportunityDetail}>{item.detail}</Text>
        <Text style={styles.opportunityImpact}>{item.impact}</Text>
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
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons color={colors.sky} name={icon} size={20} />
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        {children}
      </Card.Content>
    </Card>
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
  const icon = categoryIcons[item.category.toLowerCase()] ?? (item.type === 'income' ? 'cash-plus' : 'cash-minus');
  return (
    <View style={styles.transactionRow}>
      <View style={[styles.transactionIcon, item.type === 'income' ? styles.incomeIcon : styles.expenseIcon]}>
        <MaterialCommunityIcons color={item.type === 'income' ? colors.emerald : colors.coral} name={icon} size={20} />
      </View>
      <View style={styles.transactionText}>
        <Text style={styles.listLabel}>{item.category}</Text>
        <Text style={styles.muted}>{item.date}</Text>
      </View>
      <Text style={item.type === 'income' ? styles.income : styles.expense}>
        {item.type === 'income' ? '+' : '-'}
        {money.format(item.amount)}
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

  return (
    <View style={styles.budgetRow}>
      <View style={styles.rowBetween}>
        <Text style={styles.listLabel}>{item.category}</Text>
        <Text style={item.is_over ? styles.expense : styles.listValue}>
          {money.format(item.spent)} / {money.format(item.limit_amount)}
        </Text>
      </View>
      <ProgressBar progress={item.progress} color={item.is_over ? colors.coral : colors.emerald} style={styles.progress} />
      <View style={styles.rowBetween}>
        <Text style={styles.muted}>
          {item.is_over ? `${money.format(Math.abs(item.remaining))} over` : `${money.format(item.remaining)} left`}
        </Text>
        <TouchableOpacity onPress={onDelete}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptyState({ icon, text }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }) {
  const { colors, styles } = useDashboardTheme();

  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons color={colors.muted} name={icon} size={24} />
      <Text style={styles.muted}>{text}</Text>
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

function OfflineQueueCard({ count, onSync, syncing }: { count: number; onSync: () => void; syncing: boolean }) {
  const { colors, styles } = useDashboardTheme();

  return (
    <Card style={styles.offlineCard}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons color={colors.amber} name="cloud-sync-outline" size={22} />
          <Text style={styles.cardTitle}>{count} offline transaction{count === 1 ? '' : 's'} waiting</Text>
        </View>
        <Text style={styles.muted}>These were saved on this device and will be uploaded once the API is reachable.</Text>
        <Button loading={syncing} mode="contained" onPress={onSync} style={styles.offlineButton}>
          Sync now
        </Button>
      </Card.Content>
    </Card>
  );
}

function createStyles(colors: AppPalette) {
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
    paddingBottom: 36,
  },
  deleteText: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: '800',
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
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
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
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: '900',
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
