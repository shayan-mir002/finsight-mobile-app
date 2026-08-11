import type { ComponentProps } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { launchImageLibrary } from 'react-native-image-picker';

import { budgetsApi, goalsApi, transactionsApi } from '../api';
import CategoryIcon from '../components/CategoryIcon';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Screen from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import { categoryColors, colors, radius } from '../theme';
import type { Budget, Goal, HistoryPoint, Summary, Transaction } from '../types';
import { currentMonth, formatDate, monthLabel, pkr } from '../utils/format';

export default function DashboardScreen({ navigation }: any) {
  const { user, signOut, setAvatar } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarMenu, setAvatarMenu] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const month = currentMonth();

  const load = useCallback(async () => {
    const [sum, hist, txns, bgs, gls] = await Promise.all([
      transactionsApi.summary(month),
      transactionsApi.history(),
      transactionsApi.list(),
      budgetsApi.list(month),
      goalsApi.list(),
    ]);
    setSummary(sum);
    setHistory(hist);
    setRecent(txns.slice(0, 5));
    setBudgets(bgs);
    setGoals(gls);
  }, [month]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        try {
          await load();
        } finally {
          setLoading(false);
        }
      })();
    }, [load])
  );

  const pickAvatar = async () => {
    setAvatarMenu(false);
    const result = await launchImageLibrary({
      mediaType: 'photo',
      includeBase64: true,
      maxWidth: 512,
      maxHeight: 512,
      quality: 0.7,
      selectionLimit: 1,
    });
    const asset = result.assets?.[0];
    if (!asset?.base64) {
      if (result.errorCode) Alert.alert('Could not open photos', result.errorMessage ?? 'Try again.');
      return;
    }
    setUploadingAvatar(true);
    try {
      const mime = asset.type ?? 'image/jpeg';
      await setAvatar(`data:${mime};base64,${asset.base64}`);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const confirmRemoveAvatar = () => {
    setAvatarMenu(false);
    Alert.alert('Remove photo?', 'Your avatar will be cleared.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await setAvatar('');
          } catch (e: any) {
            Alert.alert('Remove failed', e.message);
          }
        },
      },
    ]);
  };

  const income = summary?.monthly_income ?? 0;
  const expense = summary?.monthly_expense ?? 0;
  const savings = income - expense;
  const savingsRate = income > 0 ? Math.max(0, Math.min(1, savings / income)) : 0;
  const budgetsOnTrack = budgets.length
    ? budgets.filter((b) => !b.over).length / budgets.length
    : 0;
  const goalProgress = goals.length
    ? goals.reduce((s, g) => s + Math.min(1, g.progress), 0) / goals.length
    : 0;

  const healthScore = Math.round(
    35 +
    savingsRate * 30 +
    (budgets.length ? budgetsOnTrack * 20 : 10) +
    goalProgress * 15
  );
  const healthColor =
    healthScore >= 70 ? colors.mint : healthScore >= 40 ? colors.warn : colors.danger;
  const verdict =
    healthScore >= 70
      ? 'Strong position — keep saving and stay within budgets.'
      : healthScore >= 40
        ? 'Good start — trim a few spending areas to go green.'
        : 'Needs attention — review your budgets and cut overspending.';

  const topCategory = breakdownTop();

  function breakdownTop() {
    const b = summary?.breakdown ?? [];
    return b.length ? b.reduce((max, item) => (item.amount > max.amount ? item : max), b[0]) : null;
  }

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
          <Pressable onPress={() => setAvatarMenu(true)} hitSlop={8}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Ionicons name="person" size={20} color={colors.text} />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={10} color={colors.white} />
            </View>
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
          <Text style={styles.balanceValue}>{pkr(summary?.balance ?? 0)}</Text>
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

        <Card
          title="Financial Health"
          style={styles.section}
          right={<View style={[styles.healthDot, { backgroundColor: healthColor }]} />}
        >
          <View style={styles.healthWrap}>
            <PieChart
              data={[
                { value: healthScore, color: healthColor },
                { value: Math.max(100 - healthScore, 0), color: colors.surfaceAlt },
              ]}
              donut
              radius={52}
              innerRadius={38}
              isAnimated
              strokeColor={colors.surface}
              strokeWidth={3}
              centerLabelComponent={() => (
                <View style={styles.donutCenter}>
                  <Text style={[styles.healthScore, { color: healthColor }]}>{healthScore}</Text>
                  <Text style={styles.healthScoreLabel}>/ 100</Text>
                </View>
              )}
            />
            <View style={styles.healthMetrics}>
              <HealthMetric label="Savings rate" value={`${Math.round(savingsRate * 100)}%`} />
              <HealthMetric
                label="Budgets on track"
                value={budgets.length ? `${budgets.filter((b) => !b.over).length}/${budgets.length}` : '—'}
              />
              <HealthMetric label="Goal progress" value={`${Math.round(goalProgress * 100)}%`} />
            </View>
          </View>
          <Text style={styles.verdict}>{verdict}</Text>
          {topCategory ? (
            <View style={styles.insightRow}>
              <Ionicons name="trending-up" size={15} color={colors.accent} />
              <Text style={styles.insightText}>
                {topCategory.category} is your top spending category this month at {pkr(topCategory.amount)}.
              </Text>
            </View>
          ) : null}
        </Card>

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
                      {pkr(summary?.monthly_expense ?? 0)}
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
                    <Text style={styles.legendValue}>{pkr(b.amount)}</Text>
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
                  {t.type === 'income' ? '+' : '−'} {pkr(t.amount)}
                </Text>
              </Pressable>
            ))
          )}
        </Card>
      </ScrollView>

      <Modal
        visible={avatarMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarMenu(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAvatarMenu(false)}>
          <Pressable style={styles.menu} onPress={() => {}}>
            <Pressable style={styles.menuItem} onPress={pickAvatar}>
              <Ionicons name="camera-outline" size={18} color={colors.accent} />
              <Text style={styles.menuText}>{uploadingAvatar ? 'Uploading…' : 'Change photo'}</Text>
            </Pressable>
            {user?.avatar ? (
              <Pressable style={styles.menuItem} onPress={confirmRemoveAvatar}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <Text style={[styles.menuText, { color: colors.danger }]}>Remove photo</Text>
              </Pressable>
            ) : null}
            <View style={styles.menuDivider} />
            <Pressable style={styles.menuItem} onPress={signOut}>
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              <Text style={[styles.menuText, { color: colors.danger }]}>Sign out</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
      <Text style={styles.statValue}>{pkr(value)}</Text>
    </View>
  );
}

function HealthMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
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
  healthDot: { width: 10, height: 10, borderRadius: 5 },
  healthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  donutCenter: { alignItems: 'center' },
  healthScore: { fontSize: 26, fontWeight: '800' },
  healthScoreLabel: { color: colors.textMuted, fontSize: 10 },
  healthMetrics: { flex: 1, gap: 12 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { color: colors.textMuted, fontSize: 12 },
  metricValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
  verdict: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 16,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 12,
  },
  insightText: { color: colors.text, fontSize: 12, lineHeight: 18, flex: 1 },
  breakdownWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  donutLabel: { color: colors.textMuted, fontSize: 11 },
  donutValue: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
  legend: { flex: 1, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  legendName: { color: colors.textMuted, fontSize: 13, flex: 1 },
  legendValue: { color: colors.text, fontSize: 13, fontWeight: '600' },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  txnInfo: { flex: 1, marginLeft: 12 },
  txnName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  txnDate: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  txnAmount: { fontSize: 14, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  menuDivider: { height: 1, backgroundColor: colors.border },
});
