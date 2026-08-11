export type Transaction = {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  category: string;
  date: string;
  payment_method?: string;
  notes?: string;
  created_at?: string;
};

export type Summary = {
  month: string;
  monthly_income: number;
  monthly_expense: number;
  monthly_savings: number;
  balance: number;
  breakdown: { category: string; amount: number }[];
};

export type HistoryPoint = {
  month: string;
  label: string;
  income: number;
  expense: number;
};

export type Budget = {
  id: string;
  category: string;
  limit: number;
  month: string;
  spent: number;
  remaining: number;
  progress: number;
  over: boolean;
};

export type Goal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  created_at?: string;
  progress: number;
  remaining: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};
