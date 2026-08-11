import { api } from './client';
import type {
  Budget,
  ChatMessage,
  Goal,
  HistoryPoint,
  Summary,
  Transaction,
  User,
} from '../types';

export type AuthResponse = { token: string; user: User };

export const authApi = {
  register: (name: string, email: string, password: string) =>
    api.post<AuthResponse>('/api/auth/register', { name, email, password }),
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/api/auth/login', { email, password }),
  me: () => api.get<User>('/api/auth/me'),
};

export const transactionsApi = {
  list: (params?: { type?: string; month?: string }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.append('type', params.type);
    if (params?.month) qs.append('month', params.month);
    return api.get<Transaction[]>(`/api/transactions?${qs.toString()}`);
  },
  add: (body: Omit<Transaction, 'id' | 'created_at'>) =>
    api.post<Transaction>('/api/transactions', body),
  update: (id: string, body: Omit<Transaction, 'id' | 'created_at'>) =>
    api.put<Transaction>(`/api/transactions/${id}`, body),
  remove: (id: string) => api.delete<void>(`/api/transactions/${id}`),
  summary: (month: string) => api.get<Summary>(`/api/transactions/summary?month=${month}`),
  history: () => api.get<HistoryPoint[]>('/api/transactions/history'),
};

export const budgetsApi = {
  list: (month: string) => api.get<Budget[]>(`/api/budgets?month=${month}`),
  add: (category: string, limit: number, month: string) =>
    api.post<Budget>('/api/budgets', { category, limit, month }),
  remove: (id: string) => api.delete<void>(`/api/budgets/${id}`),
};

export const goalsApi = {
  list: () => api.get<Goal[]>('/api/goals'),
  add: (body: { name: string; target_amount: number; current_amount: number; deadline: string }) =>
    api.post<Goal>('/api/goals', body),
  contribute: (id: string, amount: number) =>
    api.post<Goal>(`/api/goals/${id}/contribute?amount=${amount}`),
  remove: (id: string) => api.delete<void>(`/api/goals/${id}`),
};

export const aiApi = {
  insights: () => api.get<{ insights: string[] }>('/api/ai/insights'),
  chat: (messages: ChatMessage[]) =>
    api.post<{ reply: string }>('/api/ai/chat', { messages }),
};
