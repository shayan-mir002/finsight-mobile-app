import type { ComponentProps } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BarChart, PieChart } from 'react-native-gifted-charts';

import { aiApi, transactionsApi } from '../api';
import CategoryIcon from '../components/CategoryIcon';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Screen from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import { categoryColors, colors, radius } from '../theme';
import type { HistoryPoint, Summary, Transaction } from '../types';
import { currentMonth, formatDate, inr, monthLabel } from '../utils/format';

export default function DashboardScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const month = currentMonth();

  const load = useCallback(async () => {
    const [sum, hist, txns] = await Promise.all([
      transactionsApi.summary(month),
      transactionsApi.history(),
      transactionsApi.list(),
    ]);
    setSummary(sum);
    setHistory(hist);
    setRecent(txns.slice(0, 5));
  }, [month]);

  const loadInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const { insights } = await aiApi.insights();
      setInsights(insights);
    } catch {
      setInsights([]);
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        try {
          await Promise.all([load(), loadInsights()]);
        } finally {
          setLoading(false);
        }
      })();
    }, [load, loadInsights])
  );

  const breakdown = summary?.breakdown ?? [];
  const pieData = breakdown.map((b) => ({
    value: b.amount,
    color: categoryColors[b.category] ?? categoryColors.Other,
  }));

  const barData = history.map((h) => ({
    value: h.expense,
    label: h.label.split(' ')[0],
    frontColor: colors.mint,
  }));

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},</Text>
            <Text style={styles.name}>{user?.name}</Text>
          </View>
          <Pressable onPress={signOut} style={styles.avatar} hitSlop={8}>
            <Ionicons name="log-out-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        <LinearGradient
          colors={['#1B1440', '#7C5CFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.glow} />
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceValue}>{inr(summary?.balance ?? 0)}</Text>
          <Text style={styles.monthLabel}>{monthLabel(month)}</Text>
        </LinearGradient>

        <View style={styles.statsRow}>
          <StatCard
            label="Income"
            value={summary?.monthly_income ?? 0}
            color={colors.success}
            icon="arrow-down-circle"
          />
          <StatCard
            label="Expenses"
            value={summary?.monthly_expense ?? 0}
            color={colors.danger}
            icon="arrow-up-circle"
          />
          <StatCard
            label="Saved"
            value={summary?.monthly_savings ?? 0}
            color={colors.mint}
            icon="sparkles"
          />
        </View>

        <Card title="Spending Breakdown" style={styles.section}>
          {breakdown.length === 0 ? (
            <EmptyState
              icon="pie-chart-outline"
              title="No spending yet"
              subtitle="Add an expense to see your breakdown."
            />
          ) : (
            <View style={styles.breakdownWrap}>
              <PieChart
                data={pieData}
                donut
                radius={76}
                innerRadius={52}
                isAnimated
                strokeColor={colors.surface}
                strokeWidth={4}
                centerLabelComponent={() => (
                  <View style={styles.donutCenter}>
                    <Text style={styles.donutLabel}>Spent</Text>
                    <Text style={styles.donutValue}>
                      {inr(summary?.monthly_expense ?? 0)}
                    </Text>
                  </View>
                )}
              />
              <View style={styles.legend}>
                {breakdown.slice(0, 5).map((b) => (
                  <View key={b.category} style={styles.legendRow}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: categoryColors[b.category] },
                      ]}
                    />
                    <Text style={styles.legendName}>{b.category}</Text>
                    <Text style={styles.legendValue}>{inr(b.amount)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        {history.length > 1 && (
          <Card title="Monthly Spending Trend" style={styles.section}>
            <BarChart
              data={barData}
              height={150}
              barWidth={16}
              spacing={18}
              initialSpacing={10}
              noOfSections={4}
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
              isAnimated
            />
          </Card>
        )}

        <Card
          title="AI Insights"
          style={styles.section}
          right={
            <Pressable onPress={loadInsights} hitSlop={8}>
              {insightsLoading ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Ionicons name="refresh" size={18} color={colors.accent} />
              )}
            </Pressable>
          }
        >
          {insights.length === 0 ? (
            <Text style={styles.insightsEmpty}>
              Add some transactions to unlock personalized AI insights.
            </Text>
          ) : (
            insights.map((insight, i) => (
              <View key={i} style={styles.insightRow}>
                <Ionicons name="sparkles" size={16} color={colors.accent} />
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))
          )}
        </Card>

        <Card title="Recent Activity" style={styles.section}>
          {recent.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="No transactions"
              subtitle="Tap the + button to add your first one."
            />
          ) : (
            recent.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => navigation.navigate('Expenses', { highlight: t.id })}
                style={styles.txnRow}
              >
                <CategoryIcon category={t.category} size={38} />
                <View style={styles.txnInfo}>
                  <Text style={styles.txnName}>{t.category}</Text>
                  <Text style={styles.txnDate}>
                    {formatDate(t.date)} · {t.payment_method ?? '—'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.txnAmount,
                    { color: t.type === 'income' ? colors.success : colors.text },
                  ]}
                >
                  {t.type === 'income' ? '+' : '−'} {inr(t.amount)}
                </Text>
              </Pressable>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{inr(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  greeting: { color: colors.textMuted, fontSize: 13 },
  name: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 2 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    marginHorizontal: 20,
    borderRadius: radius.lg,
    padding: 22,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -80,
    right: -40,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  balanceValue: {
    color: colors.white,
    fontSize: 34,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  monthLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 14,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 3,
  },
  section: { marginTop: 16, marginHorizontal: 20 },
  breakdownWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  donutCenter: { alignItems: 'center' },
  donutLabel: { color: colors.textMuted, fontSize: 11 },
  donutValue: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
  legend: { flex: 1, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  legendName: { color: colors.textMuted, fontSize: 13, flex: 1 },
  legendValue: { color: colors.text, fontSize: 13, fontWeight: '600' },
  insightsEmpty: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  insightText: { color: colors.text, fontSize: 13, lineHeight: 19, flex: 1 },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  txnInfo: { flex: 1, marginLeft: 12 },
  txnName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  txnDate: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  txnAmount: { fontSize: 14, fontWeight: '700' },
});
