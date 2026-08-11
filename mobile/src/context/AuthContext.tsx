import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authApi } from '../api';
import { clearToken, getToken, setToken } from '../api/client';
import type { User } from '../types';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const me = await authApi.me();
          setUser(me);
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
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
