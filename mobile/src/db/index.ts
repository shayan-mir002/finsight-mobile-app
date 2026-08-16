import { open } from '@op-engineering/op-sqlite';
import type { DB } from '@op-engineering/op-sqlite';
import type { Budget, Goal, HistoryPoint, Summary, Transaction } from '../types';

let db: DB | null = null;

function getDB(): DB {
  if (!db) {
    db = open({ name: 'finsight.db' });
    db.executeSync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        payment_method TEXT,
        notes TEXT,
        created_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_txn_cat ON transactions(category);

      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        limit REAL NOT NULL,
        month TEXT NOT NULL,
        UNIQUE(category, month)
      );

      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        target_amount REAL NOT NULL,
        current_amount REAL NOT NULL,
        deadline TEXT NOT NULL,
        created_at TEXT
      );
    `);
  }
  return db;
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------- Transactions ----------

export async function listTransactions(opts?: { type?: string; month?: string }): Promise<Transaction[]> {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts?.type) {
    where.push('type = ?');
    params.push(opts.type);
  }
  if (opts?.month) {
    where.push('substr(date, 1, 7) = ?');
    params.push(opts.month);
  }
  const sql = `SELECT * FROM transactions${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY date DESC, created_at DESC`;
  const result = await getDB().execute(sql, params);
  return result.rows.map((r) => ({
    id: r.id as string,
    type: r.type as Transaction['type'],
    amount: Number(r.amount),
    category: r.category as string,
    date: r.date as string,
    payment_method: (r.payment_method as string) ?? undefined,
    notes: (r.notes as string) ?? undefined,
    created_at: (r.created_at as string) ?? undefined,
  }));
}

export async function addTransaction(input: {
  type: Transaction['type'];
  amount: number;
  category: string;
  date: string;
  payment_method?: string;
  notes?: string;
}): Promise<Transaction> {
  const txn: Transaction = {
    id: uid(),
    type: input.type,
    amount: round2(input.amount),
    category: input.category,
    date: input.date,
    payment_method: input.payment_method,
    notes: input.notes,
    created_at: new Date().toISOString(),
  };
  await getDB().execute(
    'INSERT INTO transactions (id, type, amount, category, date, payment_method, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [txn.id, txn.type, txn.amount, txn.category, txn.date, txn.payment_method ?? null, txn.notes ?? null, txn.created_at ?? null]
  );
  return txn;
}

export async function updateTransaction(
  id: string,
  input: {
    type: Transaction['type'];
    amount: number;
    category: string;
    date: string;
    payment_method?: string;
    notes?: string;
  }
): Promise<void> {
  await getDB().execute(
    'UPDATE transactions SET type = ?, amount = ?, category = ?, date = ?, payment_method = ?, notes = ? WHERE id = ?',
    [input.type, round2(input.amount), input.category, input.date, input.payment_method ?? null, input.notes ?? null, id]
  );
}

export async function removeTransaction(id: string): Promise<void> {
  await getDB().execute('DELETE FROM transactions WHERE id = ?', [id]);
}

export async function getSummary(month: string): Promise<Summary> {
  const monthPrefix = `${month}-`;
  const rows = await getDB().execute(
    'SELECT type, category, amount, date FROM transactions WHERE substr(date, 1, 7) = ?',
    [month]
  );
  const allRows = await getDB().execute('SELECT type, amount FROM transactions');

  let income = 0;
  let expense = 0;
  const breakdown: Record<string, number> = {};
  for (const r of rows.rows) {
    if (r.type === 'income') income += Number(r.amount);
    else {
      expense += Number(r.amount);
      const cat = r.category as string;
      breakdown[cat] = (breakdown[cat] ?? 0) + Number(r.amount);
    }
  }

  let totalIncome = 0;
  let totalExpense = 0;
  for (const r of allRows.rows) {
    if (r.type === 'income') totalIncome += Number(r.amount);
    else totalExpense += Number(r.amount);
  }

  return {
    month,
    monthly_income: round2(income),
    monthly_expense: round2(expense),
    monthly_savings: round2(income - expense),
    balance: round2(totalIncome - totalExpense),
    breakdown: Object.entries(breakdown)
      .map(([category, amount]) => ({ category, amount: round2(amount) }))
      .sort((a, b) => b.amount - a.amount),
  };
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function getHistory(): Promise<HistoryPoint[]> {
  const rows = await getDB().execute(
    'SELECT substr(date, 1, 7) AS month, type, amount FROM transactions'
  );
  const byMonth: Record<string, { income: number; expense: number }> = {};
  for (const r of rows.rows) {
    const key = r.month as string;
    if (!/^\d{4}-\d{2}$/.test(key)) continue;
    const bucket = byMonth[key] ?? (byMonth[key] = { income: 0, expense: 0 });
    if (r.type === 'income') bucket.income += Number(r.amount);
    else bucket.expense += Number(r.amount);
  }
  return Object.entries(byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => ({
      month: key,
      label: `${MONTH_NAMES[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`,
      income: round2(v.income),
      expense: round2(v.expense),
    }))
    .slice(-6);
}

export async function countTransactions(): Promise<number> {
  const result = await getDB().execute('SELECT COUNT(*) AS n FROM transactions');
  return Number(result.rows[0]?.n ?? 0);
}

export async function importTransactions(items: Transaction[]): Promise<void> {
  await getDB().transaction(async (tx) => {
    for (const t of items) {
      await tx.execute(
        'INSERT OR IGNORE INTO transactions (id, type, amount, category, date, payment_method, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [t.id, t.type, t.amount, t.category, t.date, t.payment_method ?? null, t.notes ?? null, t.created_at ?? null]
      );
    }
  });
}

// ---------- Budgets ----------

async function spentByCategory(month: string): Promise<Record<string, number>> {
  const result = await getDB().execute(
    "SELECT category, SUM(amount) AS spent FROM transactions WHERE type = 'expense' AND substr(date, 1, 7) = ? GROUP BY category",
    [month]
  );
  const map: Record<string, number> = {};
  for (const r of result.rows) map[r.category as string] = Number(r.spent);
  return map;
}

export async function listBudgets(month: string): Promise<Budget[]> {
  const [result, spent] = await Promise.all([
    getDB().execute('SELECT * FROM budgets WHERE month = ? ORDER BY category', [month]),
    spentByCategory(month),
  ]);
  return result.rows.map((r) => {
    const limit = Number(r.limit);
    const s = spent[r.category as string] ?? 0;
    return {
      id: r.id as string,
      category: r.category as string,
      limit,
      month: r.month as string,
      spent: round2(s),
      remaining: round2(Math.max(limit - s, 0)),
      progress: round2(Math.min(s / limit, 1)),
      over: s > limit,
    };
  });
}

export async function addBudget(category: string, limit: number, month: string): Promise<Budget> {
  const id = uid();
  await getDB().execute('INSERT INTO budgets (id, category, limit, month) VALUES (?, ?, ?, ?)', [
    id,
    category,
    round2(limit),
    month,
  ]);
  const all = await listBudgets(month);
  return all.find((b) => b.id === id)!;
}

export async function updateBudget(id: string, category: string, limit: number, month: string): Promise<void> {
  await getDB().execute('UPDATE budgets SET category = ?, limit = ?, month = ? WHERE id = ?', [
    category,
    round2(limit),
    month,
    id,
  ]);
}

export async function removeBudget(id: string): Promise<void> {
  await getDB().execute('DELETE FROM budgets WHERE id = ?', [id]);
}

// ---------- Goals ----------

function goalFromRow(r: Record<string, unknown>): Goal {
  const target = Number(r.target_amount);
  const current = Number(r.current_amount);
  return {
    id: r.id as string,
    name: r.name as string,
    target_amount: target,
    current_amount: current,
    deadline: r.deadline as string,
    created_at: (r.created_at as string) ?? undefined,
    progress: round2(Math.min(current / target, 1)),
    remaining: round2(Math.max(target - current, 0)),
  };
}

export async function listGoals(): Promise<Goal[]> {
  const result = await getDB().execute('SELECT * FROM goals ORDER BY created_at DESC');
  return result.rows.map(goalFromRow);
}

export async function addGoal(input: {
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
}): Promise<Goal> {
  const id = uid();
  const created_at = new Date().toISOString();
  await getDB().execute(
    'INSERT INTO goals (id, name, target_amount, current_amount, deadline, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, input.name, round2(input.target_amount), round2(input.current_amount), input.deadline, created_at]
  );
  return goalFromRow({
    id,
    name: input.name,
    target_amount: input.target_amount,
    current_amount: input.current_amount,
    deadline: input.deadline,
    created_at,
  });
}

export async function updateGoal(
  id: string,
  input: { name: string; target_amount: number; current_amount: number; deadline: string }
): Promise<void> {
  await getDB().execute(
    'UPDATE goals SET name = ?, target_amount = ?, current_amount = ?, deadline = ? WHERE id = ?',
    [input.name, round2(input.target_amount), round2(input.current_amount), input.deadline, id]
  );
}

export async function contributeGoal(id: string, amount: number): Promise<void> {
  await getDB().transaction(async (tx) => {
    const result = await tx.execute('SELECT current_amount, target_amount FROM goals WHERE id = ?', [id]);
    const row = result.rows[0];
    if (!row) return;
    const current = Math.min(Number(row.current_amount) + amount, Number(row.target_amount));
    await tx.execute('UPDATE goals SET current_amount = ? WHERE id = ?', [round2(current), id]);
  });
}

export async function removeGoal(id: string): Promise<void> {
  await getDB().execute('DELETE FROM goals WHERE id = ?', [id]);
}

export async function importBudgets(items: Budget[]): Promise<void> {
  await getDB().transaction(async (tx) => {
    for (const b of items) {
      await tx.execute('INSERT OR IGNORE INTO budgets (id, category, limit, month) VALUES (?, ?, ?, ?)', [
        b.id,
        b.category,
        b.limit,
        b.month,
      ]);
    }
  });
}

export async function importGoals(items: Goal[]): Promise<void> {
  await getDB().transaction(async (tx) => {
    for (const g of items) {
      await tx.execute(
        'INSERT OR IGNORE INTO goals (id, name, target_amount, current_amount, deadline, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [g.id, g.name, g.target_amount, g.current_amount, g.deadline, g.created_at ?? null]
      );
    }
  });
}

export { getDB };
