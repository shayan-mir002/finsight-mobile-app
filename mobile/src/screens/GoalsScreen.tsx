import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
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
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';
import ProgressBar from '../components/ProgressBar';
import Screen from '../components/Screen';
import { colors, radius } from '../theme';
import type { Goal } from '../types';
import { formatDate, pkr, todayISO } from '../utils/format';

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [deadline, setDeadline] = useState(todayISO());
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributing, setContributing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setGoals(await db.listGoals());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openModal = () => {
    setEditing(null);
    setName('');
    setTarget('');
    setCurrent('');
    setDeadline(todayISO());
    setError('');
    setModalVisible(true);
  };

  const openEdit = (g: Goal) => {
    setEditing(g);
    setName(g.name);
    setTarget(String(g.target_amount));
    setCurrent(String(g.current_amount));
    setDeadline(g.deadline);
    setError('');
    setModalVisible(true);
  };

  const saveGoal = async () => {
    const t = Number(target);
    if (!name.trim()) {
      setError('Give your goal a name.');
      return;
    }
    if (!t || t <= 0) {
      setError('Enter a valid target amount.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        target_amount: t,
        current_amount: Number(current) || 0,
        deadline,
      };
      if (editing) {
        await db.updateGoal(editing.id, body);
      } else {
        await db.addGoal(body);
      }
      haptics.success();
      setModalVisible(false);
      load();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  const submitContribute = async () => {
    const amt = Number(contributeAmount);
    if (!amt || amt <= 0 || !contributeGoal) return;
    setContributing(true);
    try {
      await db.contributeGoal(contributeGoal.id, amt);
      haptics.success();
      setContributeGoal(null);
      setContributeAmount('');
      load();
    } finally {
      setContributing(false);
    }
  };

  const pickDate = (event: DateTimePickerEvent, selected?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && selected) {
      setDeadline(selected.toISOString().slice(0, 10));
    }
  };

  const confirmDelete = (g: Goal) => {
    Alert.alert('Delete goal?', `Remove "${g.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await db.removeGoal(g.id);
          load();
        },
      },
    ]);
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Savings Goals</Text>
        <Pressable style={styles.addBtn} onPress={openModal}>
          <Ionicons name="add" size={26} color={colors.white} />
        </Pressable>
      </View>

      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} colors={[colors.accent]} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="flag-outline"
            title="No goals yet"
            subtitle="Create a savings goal and watch your progress grow."
          />
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onLongPress={() => confirmDelete(item)}>
            <View style={styles.cardTop}>
              <View style={styles.goalIcon}>
                <Ionicons name="trophy-outline" size={18} color={colors.warn} />
              </View>
              <View style={styles.goalInfo}>
                <Text style={styles.goalName}>{item.name}</Text>
                <Text style={styles.goalMeta}>by {formatDate(item.deadline)}</Text>
              </View>
              <Pressable
                style={styles.contributeBtn}
                onPress={() => {
                  setContributeAmount('');
                  setContributeGoal(item);
                }}
              >
                <Text style={styles.contributeText}>+ Add</Text>
              </Pressable>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.current}>{pkr(item.current_amount)}</Text>
              <Text style={styles.of}>of {pkr(item.target_amount)}</Text>
            </View>
            <ProgressBar progress={item.progress} color={colors.mint} />
            <View style={styles.cardFooter}>
              {item.progress >= 1 ? (
                <Text style={styles.complete}>Goal reached! 🎉</Text>
              ) : (
                <Text style={styles.remaining}>{pkr(item.remaining)} to go</Text>
              )}
              <View style={styles.cardActions}>
                <Pressable style={styles.iconBtn} hitSlop={6} onPress={() => openEdit(item)}>
                  <Ionicons name="create-outline" size={17} color={colors.mint} />
                </Pressable>
                <Pressable style={styles.iconBtn} hitSlop={6} onPress={() => confirmDelete(item)}>
                  <Ionicons name="trash-outline" size={17} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          </Pressable>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{editing ? 'Edit Goal' : 'New Goal'}</Text>
            <AppTextInput
              label="Goal name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. New bike, Goa trip"
            />
            <AppTextInput
              label="Target amount"
              value={target}
              onChangeText={setTarget}
              keyboardType="decimal-pad"
              placeholder="0"
              icon={<Text style={styles.currency}>Rs.</Text>}
            />
            <AppTextInput
              label="Already saved (optional)"
              value={current}
              onChangeText={setCurrent}
              keyboardType="decimal-pad"
              placeholder="0"
              icon={<Text style={styles.currency}>Rs.</Text>}
            />
            <Text style={styles.label}>Deadline</Text>
            <Pressable style={styles.dateRow} onPress={() => setShowPicker(true)}>
              <Ionicons name="calendar-outline" size={18} color={colors.accent} />
              <Text style={styles.dateText}>{formatDate(deadline)}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </Pressable>
            {showPicker && (
              <DateTimePicker value={new Date(deadline)} mode="date" minimumDate={new Date()} onChange={pickDate} />
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton
              label={editing ? 'Save Changes' : 'Create Goal'}
              onPress={saveGoal}
              loading={saving}
              disabled={!name || !target}
              style={styles.saveBtn}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!contributeGoal}
        transparent
        animationType="fade"
        onRequestClose={() => setContributeGoal(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setContributeGoal(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Add to “{contributeGoal?.name}”</Text>
            <AppTextInput
              value={contributeAmount}
              onChangeText={setContributeAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              icon={<Text style={styles.currency}>Rs.</Text>}
            />
            <PrimaryButton
              label="Add Amount"
              onPress={submitContribute}
              loading={contributing}
              disabled={!contributeAmount}
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
  list: { padding: 20, paddingBottom: 100, gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 16,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${colors.warn}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalInfo: { flex: 1, marginLeft: 12 },
  goalName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  goalMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  contributeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: `${colors.mint}18`,
  },
  contributeText: { color: colors.mint, fontSize: 13, fontWeight: '700' },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  current: { color: colors.text, fontSize: 17, fontWeight: '800' },
  of: { color: colors.textMuted, fontSize: 12, marginLeft: 6 },
  remaining: { color: colors.textMuted, fontSize: 12, marginTop: 10 },
  complete: { color: colors.success, fontSize: 12, marginTop: 10, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardActions: { flexDirection: 'row', gap: 6, marginTop: 8 },
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
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
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 20,
  },
  dateText: { flex: 1, color: colors.text, fontSize: 15 },
  currency: { color: colors.accent, fontSize: 18, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12 },
  saveBtn: { marginTop: 8 },
});

