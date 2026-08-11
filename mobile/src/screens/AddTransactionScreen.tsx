import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { haptics } from '../utils/haptics';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { transactionsApi } from '../api';
import AppTextInput from '../components/AppTextInput';
import PrimaryButton from '../components/PrimaryButton';
import Screen from '../components/Screen';
import {
  categoryColors,
  categoryIcons,
  colors,
  expenseCategories,
  incomeCategories,
  paymentMethods,
  radius,
} from '../theme';
import { todayISO } from '../utils/format';

export default function AddTransactionScreen({ navigation, route }: any) {
  const editId: string | null = route.params?.id ?? null;
  const isEdit = !!editId;

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(todayISO());
  const [payment, setPayment] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!editId) return;
      (async () => {
        const all = await transactionsApi.list();
        const txn = all.find((t) => t.id === editId);
        if (txn) {
          setType(txn.type);
          setAmount(String(txn.amount));
          setCategory(txn.category);
          setDate(txn.date);
          setPayment(txn.payment_method ?? 'UPI');
          setNotes(txn.notes ?? '');
        }
      })();
    }, [editId])
  );

  const categories = type === 'expense' ? expenseCategories : incomeCategories;

  const pickDate = (event: DateTimePickerEvent, selected?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && selected) {
      setDate(selected.toISOString().slice(0, 10));
    }
  };

  const save = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!category) {
      setError('Pick a category.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const body = { type, amount: value, category, date, payment_method: payment, notes };
      if (isEdit) {
        await transactionsApi.update(editId, body);
      } else {
        await transactionsApi.add(body);
      }
      haptics.success();
      navigation.goBack();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!editId) return;
    Alert.alert('Delete transaction?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await transactionsApi.remove(editId);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{isEdit ? 'Edit Transaction' : 'Add Transaction'}</Text>
        {isEdit ? (
          <Pressable onPress={confirmDelete} hitSlop={8} style={styles.backBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.typeToggle}>
            {(['expense', 'income'] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => {
                  setType(t);
                  setCategory('');
                }}
                style={[styles.typeBtn, type === t && (t === 'expense' ? styles.typeExpense : styles.typeIncome)]}
              >
                <Ionicons
                  name={t === 'expense' ? 'arrow-up-circle' : 'arrow-down-circle'}
                  size={16}
                  color={type === t ? colors.white : colors.textMuted}
                />
                <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                  {t === 'expense' ? 'Expense' : 'Income'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Amount</Text>
          <AppTextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            icon={<Text style={styles.currency}>₹</Text>}
            style={styles.amountInput}
          />

          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.categoryGrid}>
            {categories.map((c) => {
              const active = category === c;
              const color = categoryColors[c];
              return (
                <Pressable
                  key={c}
                  onPress={() => {
                    haptics.selection();
                    setCategory(c);
                  }}
                  style={[styles.categoryChip, active && { borderColor: color, backgroundColor: `${color}18` }]}
                >
                  <Ionicons name={categoryIcons[c] as never} size={17} color={active ? color : colors.textMuted} />
                  <Text style={[styles.categoryText, active && { color }]}>{c}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Date</Text>
          <Pressable style={styles.selectRow} onPress={() => setShowPicker(true)}>
            <Ionicons name="calendar-outline" size={18} color={colors.accent} />
            <Text style={styles.selectText}>{date}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </Pressable>
          {showPicker && (
            <DateTimePicker value={new Date(date)} mode="date" maximumDate={new Date()} onChange={pickDate} />
          )}

          <Text style={styles.sectionLabel}>Payment Method</Text>
          <View style={styles.paymentRow}>
            {paymentMethods.map((m) => (
              <Pressable
                key={m}
                onPress={() => setPayment(m)}
                style={[styles.paymentChip, payment === m && styles.paymentChipActive]}
              >
                <Text style={[styles.paymentText, payment === m && styles.paymentTextActive]}>{m}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Notes</Text>
          <AppTextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional note…"
            multiline
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label={isEdit ? 'Save Changes' : 'Add Transaction'}
            onPress={save}
            loading={saving}
            disabled={!amount}
            style={styles.save}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 60 },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  typeExpense: { backgroundColor: colors.danger },
  typeIncome: { backgroundColor: colors.success },
  typeText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  typeTextActive: { color: colors.white },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  currency: { color: colors.accent, fontSize: 18, fontWeight: '700' },
  amountInput: { marginBottom: 20 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 20,
  },
  selectText: { flex: 1, color: colors.text, fontSize: 15 },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  paymentChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  paymentChipActive: { borderColor: colors.mint, backgroundColor: `${colors.mint}15` },
  paymentText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  paymentTextActive: { color: colors.mint },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12 },
  save: { marginTop: 8 },
});
