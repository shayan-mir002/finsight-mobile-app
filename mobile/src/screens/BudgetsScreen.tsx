import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { haptics } from '../utils/haptics';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import * as db from '../db';
import AppTextInput from '../components/AppTextInput';
import CategoryIcon from '../components/CategoryIcon';
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';
import ProgressBar from '../components/ProgressBar';
import Screen from '../components/Screen';
import { categoryColors, colors, expenseCategories, radius } from '../theme';
import type { Budget } from '../types';
import { currentMonth, monthLabel, pkr } from '../utils/format';

export default function BudgetsScreen() {
  const month = currentMonth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBudgets(await db.listBudgets(month));
    } finally {
      setLoading(false);
    }
  }, [month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const usedCategories = budgets.map((b) => b.category);
  const available = expenseCategories.filter((c) => !usedCategories.includes(c));

  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overCount = budgets.filter((b) => b.over).length;

  const openModal = () => {
    setEditing(null);
    setCategory(available[0] ?? '');
    setLimit('');
    setError('');
    setModalVisible(true);
  };

  const openEdit = (b: Budget) => {
    setEditing(b);
    setCategory(b.category);
    setLimit(String(b.limit));
    setError('');
    setModalVisible(true);
  };

  const saveBudget = async () => {
    const value = Number(limit);
    if (!value || value <= 0) {
      setError('Enter a valid limit.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      if (editing) {
        await db.updateBudget(editing.id, category, value, month);
      } else {
        await db.addBudget(category, value, month);
      }
      haptics.success();
      setModalVisible(false);
      load();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  const confirmDelete = (b: Budget) => {
    Alert.alert('Remove budget?', `Delete the ${b.category} budget of ${pkr(b.limit)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await db.removeBudget(b.id);
          load();
        },
      },
    ]);
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Budgets</Text>
        <Pressable style={styles.addBtn} onPress={openModal}>
          <Ionicons name="add" size={26} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.overview}>
        <View style={styles.overviewTop}>
          <Text style={styles.month}>{monthLabel(month)}</Text>
          <Text style={styles.total}>{pkr(totalSpent)} / {pkr(totalLimit)}</Text>
        </View>
        <ProgressBar progress={totalLimit ? totalSpent / totalLimit : 0} color={colors.accent} />
        {overCount > 0 ? (
          <Text style={styles.warn}>{overCount} budget{overCount > 1 ? 's' : ''} over limit</Text>
        ) : (
          <Text style={styles.sub}>{pkr(Math.max(totalLimit - totalSpent, 0))} left to budget</Text>
        )}
      </View>

      <FlatList
        data={budgets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} colors={[colors.accent]} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="wallet-outline"
            title="No budgets yet"
            subtitle="Set a monthly limit for a category to stay in control."
          />
        }
        renderItem={({ item }) => {
          const color = categoryColors[item.category];
          return (
            <Pressable style={styles.card} onLongPress={() => confirmDelete(item)}>
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <CategoryIcon category={item.category} size={40} />
                  <View>
                    <Text style={styles.cardName}>{item.category}</Text>
                    <Text style={styles.cardSpent}>
                      {pkr(item.spent)} spent · {pkr(item.remaining)} left
                    </Text>
                  </View>
                </View>
                {item.over ? (
                  <View style={[styles.badge, styles.badgeOver]}>
                    <Text style={styles.badgeOverText}>Over</Text>
                  </View>
                ) : item.progress >= 0.8 ? (
                  <View style={[styles.badge, styles.badgeWarn]}>
                    <Text style={styles.badgeWarnText}>Careful</Text>
                  </View>
                ) : null}
              </View>
              <ProgressBar
                progress={item.progress}
                color={item.over ? colors.danger : color}
              />
              <View style={styles.cardFooter}>
                <Text style={styles.cardLimit}>Limit {pkr(item.limit)}</Text>
                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.iconBtn}
                    hitSlop={6}
                    onPress={() => openEdit(item)}
                  >
                    <Ionicons name="create-outline" size={17} color={colors.mint} />
                  </Pressable>
                  <Pressable
                    style={styles.iconBtn}
                    hitSlop={6}
                    onPress={() => confirmDelete(item)}
                  >
                    <Ionicons name="trash-outline" size={17} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{editing ? 'Edit Budget' : 'New Budget'}</Text>
            <Text style={styles.sectionLabel}>Category</Text>
            <View style={styles.categoryRow}>
              {editing
                ? (
                  <View style={[styles.chip, styles.chipSelected, { borderColor: categoryColors[editing.category] }]}>
                    <Text style={[styles.chipText, { color: categoryColors[editing.category] }]}>
                      {editing.category}
                    </Text>
                  </View>
                )
                : available.map((c) => {
                    const active = category === c;
                    const color = categoryColors[c];
                    return (
                      <Pressable
                        key={c}
                        onPress={() => setCategory(c)}
                        style={[styles.chip, active && { borderColor: color, backgroundColor: `${color}18` }]}
                      >
                        <Text style={[styles.chipText, active && { color }]}>{c}</Text>
                      </Pressable>
                    );
                  })}
            </View>
            <Text style={styles.sectionLabel}>Monthly Limit</Text>
            <AppTextInput
              value={limit}
              onChangeText={setLimit}
              keyboardType="decimal-pad"
              placeholder="0"
              icon={<Text style={styles.currency}>Rs.</Text>}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton
              label={editing ? 'Save Changes' : 'Save Budget'}
              onPress={saveBudget}
              loading={saving}
              disabled={!limit}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overview: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 6,
  },
  overviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  month: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  total: { color: colors.text, fontSize: 14, fontWeight: '700' },
  warn: { color: colors.warn, fontSize: 12, marginTop: 10, fontWeight: '600' },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 10 },
  list: { padding: 20, paddingBottom: 100, gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 16,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  cardSpent: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  cardLimit: { color: colors.textMuted, fontSize: 11, marginTop: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardActions: { flexDirection: 'row', gap: 6, marginTop: 4 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: `${colors.accent}18` },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  badgeOver: { backgroundColor: `${colors.danger}20` },
  badgeOverText: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  badgeWarn: { backgroundColor: `${colors.warn}20` },
  badgeWarnText: { color: colors.warn, fontSize: 12, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 20 },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  currency: { color: colors.accent, fontSize: 18, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12 },
});

