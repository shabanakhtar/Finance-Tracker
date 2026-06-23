import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Chip, IconButton, ProgressBar, SegmentedButtons, TextInput } from 'react-native-paper';

import { AppPalette } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useAppTheme } from '@/contexts/theme';
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

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
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

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
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
  };

  const submitEdit = async () => {
    if (!editing?.id) return;
    const parsedAmount = Number(editing.amount);

    if (!parsedAmount || parsedAmount <= 0 || !editing.category.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(editing.date)) {
      Alert.alert('Check transaction', 'Use a positive amount, category, and YYYY-MM-DD date.');
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
    const parsedAmount = Number(budgetAmount);
    if (!budgetCategory.trim() || !parsedAmount || parsedAmount <= 0) {
      Alert.alert('Check budget', 'Enter a category and a monthly limit greater than zero.');
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
      <View style={styles.centered}>
        <View style={styles.loadingMark}>
          <ActivityIndicator color={colors.sky} size="large" />
        </View>
        <Text style={styles.loadingTitle}>Preparing your dashboard</Text>
        <Text style={styles.muted}>Syncing Vercel, Supabase, and your latest transactions.</Text>
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
          <Text style={styles.title}>Dashboard</Text>
        </View>
        <IconButton icon="logout" iconColor={colors.ink} mode="contained-tonal" onPress={signOut} size={20} />
      </View>

      <Text style={styles.subtitle}>{session?.user.email ?? 'Signed in'} - API live</Text>

      {error ? <ErrorState error={error} onRetry={loadDashboard} /> : null}

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

          {isEmptyAccount ? <GettingStartedCard /> : null}

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
              <EmptyState icon="magnify-scan" text="Add more transactions to unlock recurring, unusual spend, and value-saving ideas." />
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
              <EmptyState icon="chart-line" text="Add income and expenses to see monthly trends." />
            )}
          </Section>

          <Section title="Budgets" icon="target">
            <View style={styles.formGrid}>
              <TextInput
                autoCapitalize="none"
                label="Category"
                mode="outlined"
                onChangeText={setBudgetCategory}
                placeholder="food"
                style={styles.input}
                value={budgetCategory}
              />
              <TextInput
                keyboardType="decimal-pad"
                label="Monthly limit"
                mode="outlined"
                onChangeText={setBudgetAmount}
                placeholder="15000"
                style={styles.input}
                value={budgetAmount}
              />
              <Button disabled={savingBudget} loading={savingBudget} mode="contained" onPress={submitBudget} style={styles.primaryButton}>
                Save Budget
              </Button>
            </View>
            <View style={styles.sectionGap}>
              {dashboard.budget_status.length ? (
                dashboard.budget_status.map((item) => (
                  <BudgetRow key={item.category} item={item} onDelete={() => removeBudget(item.category)} />
                ))
              ) : (
                <EmptyState icon="wallet-plus-outline" text="Set your first monthly limit for food, rent, or transport." />
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
                <TextInput
                  keyboardType="decimal-pad"
                  label="Amount"
                  mode="outlined"
                  onChangeText={(value) => setEditing({ ...editing, amount: value })}
                  style={styles.input}
                  value={editing.amount}
                />
                <TextInput
                  autoCapitalize="none"
                  label="Category"
                  mode="outlined"
                  onChangeText={(value) => setEditing({ ...editing, category: value })}
                  style={styles.input}
                  value={editing.category}
                />
                <TextInput
                  keyboardType="numbers-and-punctuation"
                  label="Date"
                  mode="outlined"
                  onChangeText={(value) => setEditing({ ...editing, date: value })}
                  style={styles.input}
                  value={editing.date}
                />
                <TextInput
                  label="Notes"
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  onChangeText={(value) => setEditing({ ...editing, notes: value })}
                  style={styles.input}
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
              <EmptyState icon="receipt-text-plus-outline" text="No transactions yet. Use the Add tab to create your first entry." />
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
              <EmptyState icon="chart-pie" text="Expense categories will appear after your first spending entries." />
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
                <EmptyState icon="creation-outline" text="More transaction history will unlock AI finance insights." />
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

function GettingStartedCard() {
  const { colors, styles } = useDashboardTheme();

  return (
    <Card style={styles.startCard}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons color={colors.sky} name="map-marker-path" size={20} />
          <Text style={styles.cardTitle}>Start with three entries</Text>
        </View>
        <Text style={styles.startText}>
          Add one income entry, one normal expense, and one budget. The dashboard and AI assistant become much more useful after that.
        </Text>
        <View style={styles.startSteps}>
          <StepBadge icon="cash-plus" text="Income" />
          <StepBadge icon="receipt-text-plus-outline" text="Expense" />
          <StepBadge icon="target" text="Budget" />
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

function StepBadge({ icon, text }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }) {
  const { colors, styles } = useDashboardTheme();

  return (
    <View style={styles.stepBadge}>
      <MaterialCommunityIcons color={colors.sky} name={icon} size={16} />
      <Text style={styles.stepText}>{text}</Text>
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
            onPress={() => router.push({ pathname: '/explore', params: { category: item.category, type: item.type } })}
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
  const { colors, styles } = useDashboardTheme();

  return (
    <Card style={styles.errorCard}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons color={colors.coral} name="cloud-alert-outline" size={22} />
          <Text style={styles.errorTitle}>Backend unavailable</Text>
        </View>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={onRetry} style={styles.errorButton}>
          Retry
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
  centered: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    padding: 24,
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
