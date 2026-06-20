import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, ProgressBar } from 'react-native-paper';

import { useAuth } from '@/contexts/auth';
import { API_BASE_URL, Dashboard, getDashboard } from '@/services/api';

const money = new Intl.NumberFormat('en-PK', {
  maximumFractionDigits: 0,
  style: 'currency',
  currency: 'PKR',
});

export default function DashboardScreen() {
  const { session, signOut } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
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
        <Text style={styles.subtitle}>{session?.user.email ?? 'Signed in'} · {API_BASE_URL}</Text>
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
              <Text style={styles.cardTitle}>Top Spending</Text>
              {dashboard.top_categories.length ? (
                dashboard.top_categories.map(([category, amount]) => (
                  <View key={category} style={styles.listRow}>
                    <Text style={styles.listLabel}>{category}</Text>
                    <Text style={styles.listValue}>{money.format(amount)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>No expense categories yet.</Text>
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

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Recent Transactions</Text>
              {dashboard.recent_transactions.map((item, index) => (
                <View key={`${item.date}-${item.category}-${index}`} style={styles.transactionRow}>
                  <View>
                    <Text style={styles.listLabel}>{item.category}</Text>
                    <Text style={styles.muted}>{item.date}</Text>
                  </View>
                  <Text style={item.type === 'income' ? styles.income : styles.expense}>
                    {item.type === 'income' ? '+' : '-'}{money.format(item.amount)}
                  </Text>
                </View>
              ))}
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

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    backgroundColor: '#f5faf7',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#f5faf7',
    gap: 16,
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    gap: 4,
    paddingTop: 12,
  },
  eyebrow: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: '#101827',
    fontSize: 34,
    fontWeight: '800',
  },
  subtitle: {
    color: '#667085',
    fontSize: 13,
  },
  signOutButton: {
    alignSelf: 'flex-start',
    borderColor: '#b7cdc7',
    borderRadius: 8,
    marginTop: 8,
  },
  statGrid: {
    gap: 12,
  },
  statCard: {
    borderRadius: 8,
  },
  positive: {
    backgroundColor: '#e9f8ef',
  },
  negative: {
    backgroundColor: '#fff1f0',
  },
  neutral: {
    backgroundColor: '#eef5ff',
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  errorCard: {
    backgroundColor: '#fff1f0',
    borderRadius: 8,
  },
  errorTitle: {
    color: '#991b1b',
    fontSize: 18,
    fontWeight: '800',
  },
  errorText: {
    color: '#7f1d1d',
    marginTop: 6,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#991b1b',
    marginTop: 12,
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: '#101827',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  score: {
    color: '#0f766e',
    fontSize: 18,
    fontWeight: '800',
  },
  progress: {
    borderRadius: 999,
    height: 10,
    marginBottom: 10,
  },
  muted: {
    color: '#667085',
    fontSize: 13,
  },
  listRow: {
    alignItems: 'center',
    borderBottomColor: '#edf2f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
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
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#e8f3ef',
    borderRadius: 8,
  },
  chipText: {
    color: '#0f4d46',
  },
  transactionRow: {
    alignItems: 'center',
    borderBottomColor: '#edf2f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  income: {
    color: '#047857',
    fontSize: 15,
    fontWeight: '800',
  },
  expense: {
    color: '#b42318',
    fontSize: 15,
    fontWeight: '800',
  },
});
