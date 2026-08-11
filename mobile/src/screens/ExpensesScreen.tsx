import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { transactionsApi } from '../api';
import CategoryIcon from '../components/CategoryIcon';
import EmptyState from '../components/EmptyState';
import Screen from '../components/Screen';
import { colors, radius } from '../theme';
import type { Transaction } from '../types';
import { formatDate, inr } from '../utils/format';

const FILTERS = ['All', 'Expense', 'Income'] as const;

export default function ExpensesScreen({ navigation }: any) {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await transactionsApi.list();
      setTxns(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = filter === 'All' ? txns : txns.filter((t) => t.type === filter.toLowerCase());

  const confirmDelete = (t: Transaction) => {
    Alert.alert('Delete transaction?', `Remove ${t.category} — ${inr(t.amount)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await transactionsApi.remove(t.id);
          load();
        },
      },
    ]);
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddTransaction')}
        >
          <Ionicons name="add" size={26} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="Nothing here yet"
            subtitle="Tap + to record your first transaction."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('AddTransaction', { id: item.id })}
            onLongPress={() => confirmDelete(item)}
          >
            <CategoryIcon category={item.category} size={40} />
            <View style={styles.info}>
              <Text style={styles.name}>{item.category}</Text>
              <Text style={styles.meta}>
                {formatDate(item.date)} · {item.payment_method ?? '—'}
                {item.notes ? ` · ${item.notes}` : ''}
              </Text>
            </View>
            <Text
              style={[
                styles.amount,
                { color: item.type === 'income' ? colors.success : colors.text },
              ]}
            >
              {item.type === 'income' ? '+' : '−'} {inr(item.amount)}
            </Text>
          </Pressable>
        )}
      />
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
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: colors.white },
  list: { padding: 20, paddingBottom: 100, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
  },
  info: { flex: 1, marginLeft: 12 },
  name: { color: colors.text, fontSize: 15, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  amount: { fontSize: 15, fontWeight: '700' },
});
