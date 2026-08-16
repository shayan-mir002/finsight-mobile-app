import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { authApi, budgetsApi, goalsApi, transactionsApi } from '../api';
import { clearToken, getToken, setToken } from '../api/client';
import * as db from '../db';
import type { User } from '../types';
import { currentMonth } from '../utils/format';

const AVATAR_KEY = 'finsight_avatar';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setAvatar: (avatar: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function migrateFromBackend(): Promise<void> {
  try {
    if ((await db.countTransactions()) > 0) return;
    const [txns, bgs, gls] = await Promise.all([
      transactionsApi.list(),
      budgetsApi.list(currentMonth()),
      goalsApi.list(),
    ]);
    await Promise.all([
      db.importTransactions(txns),
      db.importBudgets(bgs),
      db.importGoals(gls),
    ]);
  } catch {
    // offline or backend down — start fresh locally
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const me = await authApi.me();
          const avatar = await AsyncStorage.getItem(AVATAR_KEY);
          setUser(avatar ? { ...me, avatar } : me);
          await migrateFromBackend();
        }
      } catch {
        await clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (token: string, user: User) => {
    await setToken(token);
    setUser(user);
    await migrateFromBackend();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { token, user } = await authApi.login(email, password);
      await persist(token, user);
    },
    [persist]
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const { token, user } = await authApi.register(name, email, password);
      await persist(token, user);
    },
    [persist]
  );

  const signOut = useCallback(async () => {
    await clearToken();
    await AsyncStorage.removeItem(AVATAR_KEY);
    setUser(null);
  }, []);

  const setAvatar = useCallback(async (avatar: string) => {
    await AsyncStorage.setItem(AVATAR_KEY, avatar);
    setUser((prev) => (prev ? { ...prev, avatar } : prev));
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut, setAvatar }),
    [user, loading, signIn, signUp, signOut, setAvatar]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
