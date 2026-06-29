import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedCard, AnimatedProgressBar, AppErrorState, EmptyState, SkeletonList } from '@/components/ux';
import { AppPalette, radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/contexts/theme';
import { Dashboard, InsightCard, Opportunity, getDashboard } from '@/services/api';

const money = new Intl.NumberFormat('en-PK', {
  currency: 'PKR',
  maximumFractionDigits: 0,
  style: 'currency',
});

export default function AnalysisScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      const nextDashboard = await getDashboard();
      setDashboard(nextDashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load analysis.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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
  const scoreProgress = Math.max(0, Math.min((dashboard?.financial_score ?? 0) / 100, 1));

  const refresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.title}>Analysis</Text>
        <Text style={styles.subtitle}>Reading your spending patterns.</Text>
        <SkeletonList count={4} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl onRefresh={refresh} refreshing={refreshing} tintColor={colors.sky} />}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons color={colors.sky} name="chart-timeline-variant" size={24} />
        </View>
        <Text style={styles.title}>Analysis</Text>
        <Text style={styles.subtitle}>Scores, trends, and opportunities live here so Home can stay focused.</Text>
      </View>

      {error ? <AppErrorState actionLabel="Retry" message={error} onAction={loadDashboard} title="Could not load analysis" /> : null}

      {dashboard ? (
        <>
          <AnimatedCard>
            <Card style={styles.scoreCard}>
              <Card.Content style={styles.scoreContent}>
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreValue}>{dashboard.financial_score}</Text>
                  <Text style={styles.scoreMax}>/100</Text>
                </View>
                <View style={styles.scoreText}>
                  <Text style={styles.cardTitle}>Financial score</Text>
                  <AnimatedProgressBar color={colors.emerald} progress={scoreProgress} />
                  <Text style={styles.muted}>{dashboard.transaction_count} transactions analyzed</Text>
                </View>
              </Card.Content>
            </Card>
          </AnimatedCard>

          <Section icon="chart-bar" title="Monthly cash flow">
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
              <EmptyState icon="chart-line" text="Add income and expenses to see your cash-flow pattern." />
            )}
          </Section>

          <Section icon="tag-multiple-outline" title="Top categories">
            {dashboard.top_categories.length ? (
              <View style={styles.categoryList}>
                {dashboard.top_categories.slice(0, 5).map(([category, amount]) => (
                  <View key={category} style={styles.categoryRow}>
                    <Text style={styles.listLabel}>{category}</Text>
                    <Text style={styles.listValue}>{money.format(amount)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState icon="tag-outline" text="Top spending categories appear after you add a few expenses." />
            )}
          </Section>

          <Section icon="creation-outline" title="Opportunities">
            {dashboard.opportunities?.length ? (
              <View style={styles.opportunityList}>
                {dashboard.opportunities.map((item, index) => (
                  <OpportunityRow item={item} key={`${item.kind}-${index}`} styles={styles} colors={colors} />
                ))}
              </View>
            ) : (
              <EmptyState icon="magnify-scan" text="Opportunities highlight recurring bills, unusual spending, and value swaps." />
            )}
          </Section>

          <Section icon="lightbulb-on-outline" title="Smart insights">
            {dashboard.insight_cards?.length ? (
              <View style={styles.insightCardList}>
                {dashboard.insight_cards.map((item) => (
                  <InsightCardRow item={item} key={`${item.kind}-${item.title}`} styles={styles} colors={colors} />
                ))}
              </View>
            ) : null}
            <View style={styles.chipWrap}>
              {[...dashboard.warnings, ...dashboard.insights].slice(0, 8).map((item, index) => (
                <Chip compact key={`${item}-${index}`} style={styles.chip} textStyle={styles.chipText}>
                  {item}
                </Chip>
              ))}
              {!dashboard.warnings.length && !dashboard.insights.length ? (
                <EmptyState icon="creation-outline" text="Insights become more useful once there is more history to compare." />
              ) : null}
            </View>
          </Section>
        </>
      ) : null}
    </ScrollView>
  );
}

function Section({ children, icon, title }: { children: ReactNode; icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, 0), [colors]);

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

function OpportunityRow({ colors, item, styles }: { colors: AppPalette; item: Opportunity; styles: ReturnType<typeof createStyles> }) {
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
        <Text style={styles.detail}>{item.detail}</Text>
        <Text style={styles.impact}>{item.impact}</Text>
      </View>
    </View>
  );
}

function InsightCardRow({ colors, item, styles }: { colors: AppPalette; item: InsightCard; styles: ReturnType<typeof createStyles> }) {
  const tone =
    item.severity === 'high'
      ? { color: colors.coral, icon: 'alert-circle-outline' as const, surface: colors.coralSoft }
      : item.severity === 'positive'
        ? { color: colors.emerald, icon: 'check-decagram-outline' as const, surface: colors.emeraldSoft }
        : item.severity === 'medium'
          ? { color: colors.amber, icon: 'lightning-bolt-outline' as const, surface: colors.warningSoft }
          : { color: colors.sky, icon: 'information-outline' as const, surface: colors.skySoft };

  return (
    <View style={styles.insightCard}>
      <View style={styles.insightHeader}>
        <View style={[styles.insightIcon, { backgroundColor: tone.surface }]}>
          <MaterialCommunityIcons color={tone.color} name={tone.icon} size={18} />
        </View>
        <Text style={styles.insightTitle}>{item.title}</Text>
      </View>
      <Text style={styles.detail}>{item.detail}</Text>
      <Text style={styles.impact}>{item.action}</Text>
    </View>
  );
}

function createStyles(colors: AppPalette, bottomInset: number) {
  return StyleSheet.create({
    barColumn: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      gap: 4,
      height: 96,
      justifyContent: 'center',
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radii.card,
      borderWidth: 1,
    },
    cardTitle: {
      color: colors.ink,
      fontSize: 18,
      fontWeight: '900',
    },
    categoryList: {
      gap: spacing.sm,
    },
    categoryRow: {
      alignItems: 'center',
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: radii.card,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: spacing.md,
    },
    chartPanel: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'space-between',
      paddingTop: spacing.xs,
    },
    chip: {
      backgroundColor: colors.violetSoft,
      borderRadius: radii.card,
    },
    chipText: {
      color: colors.ink,
      fontWeight: '700',
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    container: {
      backgroundColor: colors.background,
      gap: spacing.lg,
      padding: spacing.xl,
      paddingBottom: Math.max(124, bottomInset + 112),
      paddingTop: 34,
    },
    detail: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 3,
    },
    expenseBar: {
      backgroundColor: colors.coral,
      borderRadius: radii.pill,
      minHeight: 8,
      width: 12,
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
    impact: {
      color: colors.sky,
      fontSize: 12,
      fontWeight: '900',
      lineHeight: 17,
      marginTop: 6,
    },
    incomeBar: {
      backgroundColor: colors.emerald,
      borderRadius: radii.pill,
      minHeight: 8,
      width: 12,
    },
    insightCard: {
      borderColor: colors.border,
      borderRadius: radii.card,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.md,
    },
    insightCardList: {
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    insightHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    insightIcon: {
      alignItems: 'center',
      borderRadius: radii.card,
      height: 34,
      justifyContent: 'center',
      width: 34,
    },
    insightTitle: {
      color: colors.ink,
      flex: 1,
      fontSize: 15,
      fontWeight: '900',
    },
    listLabel: {
      color: colors.ink,
      flex: 1,
      fontSize: 15,
      fontWeight: '900',
      textTransform: 'capitalize',
    },
    listValue: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: '900',
    },
    loadingScreen: {
      backgroundColor: colors.background,
      flex: 1,
      gap: spacing.lg,
      padding: spacing.xl,
      paddingTop: 72,
    },
    monthCol: {
      alignItems: 'center',
      flex: 1,
      gap: spacing.sm,
    },
    monthLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '900',
    },
    muted: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    opportunityIcon: {
      alignItems: 'center',
      borderRadius: radii.card,
      height: 42,
      justifyContent: 'center',
      width: 42,
    },
    opportunityList: {
      gap: spacing.sm,
    },
    opportunityRow: {
      alignItems: 'flex-start',
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: radii.card,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
    },
    opportunityText: {
      flex: 1,
    },
    scoreCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radii.card,
      borderWidth: 1,
    },
    scoreCircle: {
      alignItems: 'center',
      backgroundColor: colors.skySoft,
      borderColor: colors.border,
      borderRadius: radii.pill,
      borderWidth: 1,
      height: 78,
      justifyContent: 'center',
      width: 78,
    },
    scoreContent: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.lg,
    },
    scoreMax: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '900',
    },
    scoreText: {
      flex: 1,
      gap: spacing.sm,
    },
    scoreValue: {
      color: colors.sky,
      fontSize: 26,
      fontWeight: '900',
    },
    sectionHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
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
