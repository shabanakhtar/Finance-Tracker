import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, ProgressBar, SegmentedButtons, TextInput } from 'react-native-paper';

import { useAuth } from '@/contexts/auth';
import {
  API_BASE_URL,
  BudgetStatus,
  Dashboard,
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

type TransactionForm = {
  id?: string;
  amount: string;
  category: string;
  date: string;
  type: 'income' | 'expense';
};

export default function DashboardScreen() {
  const { session, signOut } = useAuth();
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

  const scoreProgress = useMemo(() => {
    return Math.max(0, Math.min((dashboard?.financial_score ?? 0) / 100, 1));
  }, [dashboard?.financial_score]);

  const maxMonthlyValue = useMemo(() => {
    if (!dashboard) return 1;
    return Math.max(
      1,
      ...Object.values(dashboard.monthly).flatMap((item) => [item.income, item.expense]),
    );
  }, [dashboard]);

  const monthlyRows = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard.monthly).sort(([left], [right]) => right.localeCompare(left)).slice(0, 6);
  }, [dashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const startEdit = (item: Transaction) => {
    if (!item.id) {
      Alert.alert('Missing transaction id', 'This item cannot be edited because the backend did not return its id.');
      return;
    }

    setEditing({
      id: item.id,
      amount: String(item.amount),
      category: item.category,
      date: item.date,
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

  const removeTransaction = async (id?: string) => {
    if (!id) return;
    try {
      await deleteTransaction(id);
      if (editing?.id === id) setEditing(null);
      await loadDashboard();
    } catch (err) {
      Alert.alert('Could not delete', err instanceof Error ? err.message : 'Backend request failed.');
    }
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
    try {
      await deleteBudget(category);
      await loadDashboard();
    } catch (err) {
      Alert.alert('Could not delete budget', err instanceof Error ? err.message : 'Backend request failed.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0f766e" size="large" />
        <Text style={styles.muted}>Loading your finance dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>AI Finance Tracker</Text>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>{session?.user.email ?? 'Signed in'} | {API_BASE_URL}</Text>
        <Button compact mode="outlined" onPress={signOut} style={styles.signOutButton}>
          Sign Out
        </Button>
      </View>

      {error ? (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorTitle}>Backend unavailable</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="contained" onPress={loadDashboard} style={styles.retryButton}>
              Retry
            </Button>
          </Card.Content>
        </Card>
      ) : null}

      {dashboard ? (
        <>
          <View style={styles.statGrid}>
            <StatCard label="Income" tone="positive" value={money.format(dashboard.summary.income)} />
            <StatCard label="Expenses" tone="negative" value={money.format(dashboard.summary.expense)} />
            <StatCard label="Balance" tone="neutral" value={money.format(dashboard.summary.balance)} />
          </View>

          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>Financial Score</Text>
                <Text style={styles.score}>{dashboard.financial_score}/100</Text>
              </View>
              <ProgressBar progress={scoreProgress} color="#0f766e" style={styles.progress} />
              <Text style={styles.muted}>{dashboard.transaction_count} transactions analyzed</Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Monthly Cash Flow</Text>
              {monthlyRows.length ? (
                monthlyRows.map(([month, value]) => (
                  <View key={month} style={styles.chartRow}>
                    <Text style={styles.chartLabel}>{month}</Text>
                    <View style={styles.chartBars}>
                      <ChartBar color="#047857" ratio={value.income / maxMonthlyValue} />
                      <ChartBar color="#b42318" ratio={value.expense / maxMonthlyValue} />
                    </View>
                    <Text style={styles.chartValue}>{money.format(value.income - value.expense)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>Add income and expenses to see monthly trends.</Text>
              )}
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Expense Breakdown</Text>
              {Object.keys(dashboard.breakdown).length ? (
                Object.entries(dashboard.breakdown).map(([category, percent]) => (
                  <View key={category} style={styles.breakdownRow}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.listLabel}>{category}</Text>
                      <Text style={styles.listValue}>{percent.toFixed(1)}%</Text>
                    </View>
                    <ProgressBar progress={Math.min(percent / 100, 1)} color="#0f766e" style={styles.progress} />
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>No expense categories yet.</Text>
              )}
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Budget Settings</Text>
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
              </View>
              <Button
                disabled={savingBudget}
                loading={savingBudget}
                mode="contained"
                onPress={submitBudget}
                style={styles.primaryButton}>
                Save Budget
              </Button>
              <View style={styles.sectionGap}>
                {dashboard.budget_status.length ? (
                  dashboard.budget_status.map((item) => (
                    <BudgetRow key={item.category} item={item} onDelete={() => removeBudget(item.category)} />
                  ))
                ) : (
                  <Text style={styles.muted}>No budgets yet. Add one for categories like food, rent, or transport.</Text>
                )}
              </View>
            </Card.Content>
          </Card>

          {editing ? (
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardTitle}>Edit Transaction</Text>
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
                </View>
                <View style={styles.actionRow}>
                  <Button disabled={savingTransaction} mode="outlined" onPress={() => setEditing(null)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={savingTransaction}
                    loading={savingTransaction}
                    mode="contained"
                    onPress={submitEdit}
                    style={styles.primaryButton}>
                    Update
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ) : null}

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Recent Transactions</Text>
              {dashboard.recent_transactions.length ? (
                dashboard.recent_transactions.map((item, index) => (
                  <View key={item.id ?? `${item.date}-${item.category}-${index}`} style={styles.transactionRow}>
                    <View style={styles.transactionText}>
                      <Text style={styles.listLabel}>{item.category}</Text>
                      <Text style={styles.muted}>{item.date}</Text>
                    </View>
                    <Text style={item.type === 'income' ? styles.income : styles.expense}>
                      {item.type === 'income' ? '+' : '-'}{money.format(item.amount)}
                    </Text>
                    <View style={styles.rowActions}>
                      <Button compact mode="text" onPress={() => startEdit(item)}>
                        Edit
                      </Button>
                      <Button compact textColor="#b42318" mode="text" onPress={() => removeTransaction(item.id)}>
                        Delete
                      </Button>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>No transactions yet. Use the Add tab to create your first one.</Text>
              )}
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Smart Insights</Text>
              <View style={styles.chipWrap}>
                {[...dashboard.warnings, ...dashboard.insights].slice(0, 8).map((item, index) => (
                  <Chip key={`${item}-${index}`} compact style={styles.chip} textStyle={styles.chipText}>
                    {item}
                  </Chip>
                ))}
                {!dashboard.warnings.length && !dashboard.insights.length ? (
                  <Text style={styles.muted}>Add more transactions to unlock insights.</Text>
                ) : null}
              </View>
            </Card.Content>
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: 'positive' | 'negative' | 'neutral' }) {
  return (
    <Card style={[styles.statCard, styles[tone]]}>
      <Card.Content>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </Card.Content>
    </Card>
  );
}

function ChartBar({ color, ratio }: { color: string; ratio: number }) {
  return (
    <View style={styles.chartTrack}>
      <View style={[styles.chartFill, { backgroundColor: color, width: `${Math.max(4, Math.min(ratio * 100, 100))}%` }]} />
    </View>
  );
}

function BudgetRow({ item, onDelete }: { item: BudgetStatus; onDelete: () => void }) {
  return (
    <View style={styles.budgetRow}>
      <View style={styles.rowBetween}>
        <Text style={styles.listLabel}>{item.category}</Text>
        <Text style={item.is_over ? styles.expense : styles.listValue}>
          {money.format(item.spent)} / {money.format(item.limit_amount)}
        </Text>
      </View>
      <ProgressBar progress={item.progress} color={item.is_over ? '#b42318' : '#0f766e'} style={styles.progress} />
      <View style={styles.rowBetween}>
        <Text style={styles.muted}>
          {item.is_over ? `${money.format(Math.abs(item.remaining))} over` : `${money.format(item.remaining)} left`}
        </Text>
        <Button compact textColor="#b42318" mode="text" onPress={onDelete}>
          Delete
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  breakdownRow: {
    gap: 8,
    marginBottom: 12,
  },
  budgetRow: {
    borderTopColor: '#edf2f0',
    borderTopWidth: 1,
    gap: 8,
    paddingTop: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  cardTitle: {
    color: '#101827',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  centered: {
    alignItems: 'center',
    backgroundColor: '#f5faf7',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
  chartBars: {
    flex: 1,
    gap: 4,
  },
  chartFill: {
    borderRadius: 999,
    height: 8,
  },
  chartLabel: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '800',
    width: 58,
  },
  chartRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  chartTrack: {
    backgroundColor: '#edf2f0',
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  chartValue: {
    color: '#475467',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    width: 86,
  },
  chip: {
    backgroundColor: '#e8f3ef',
    borderRadius: 8,
  },
  chipText: {
    color: '#0f4d46',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  container: {
    backgroundColor: '#f5faf7',
    gap: 16,
    padding: 20,
    paddingBottom: 32,
  },
  errorCard: {
    backgroundColor: '#fff1f0',
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
    color: '#b42318',
    fontSize: 15,
    fontWeight: '800',
  },
  formGrid: {
    gap: 10,
    marginTop: 4,
  },
  header: {
    gap: 4,
    paddingTop: 12,
  },
  income: {
    color: '#047857',
    fontSize: 15,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#ffffff',
  },
  listLabel: {
    color: '#101827',
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  listValue: {
    color: '#344054',
    fontSize: 15,
    fontWeight: '700',
  },
  muted: {
    color: '#667085',
    fontSize: 13,
  },
  negative: {
    backgroundColor: '#fff1f0',
  },
  neutral: {
    backgroundColor: '#eef5ff',
  },
  positive: {
    backgroundColor: '#e9f8ef',
  },
  primaryButton: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    marginTop: 10,
  },
  progress: {
    borderRadius: 999,
    height: 10,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#991b1b',
    marginTop: 12,
  },
  rowActions: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  score: {
    color: '#0f766e',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionGap: {
    gap: 12,
    marginTop: 14,
  },
  signOutButton: {
    alignSelf: 'flex-start',
    borderColor: '#b7cdc7',
    borderRadius: 8,
    marginTop: 8,
  },
  statCard: {
    borderRadius: 8,
  },
  statGrid: {
    gap: 12,
  },
  statLabel: {
    color: '#475467',
    fontSize: 13,
    fontWeight: '700',
  },
  statValue: {
    color: '#101827',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  subtitle: {
    color: '#667085',
    fontSize: 13,
  },
  title: {
    color: '#101827',
    fontSize: 34,
    fontWeight: '800',
  },
  transactionRow: {
    alignItems: 'center',
    borderBottomColor: '#edf2f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  transactionText: {
    flex: 1,
  },
  eyebrow: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
