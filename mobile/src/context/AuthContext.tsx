// Auth state: JWT persisted in SecureStore (only when "remember me"), user cached in AsyncStorage.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse, User } from '../types';
import { setAuthToken } from '../api/client';

const TOKEN_KEY = 'syd_jwt';
const USER_KEY = 'syd_user';

interface AuthState {
  user: User | null;
  token: string | null;
  ready: boolean;
  signIn: (res: AuthResponse, remember?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (u: Partial<User>) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Restore a remembered session on launch
  useEffect(() => {
    (async () => {
      try {
        const t = await SecureStore.getItemAsync(TOKEN_KEY);
        const u = await AsyncStorage.getItem(USER_KEY);
        if (t && u) { setAuthToken(t); setToken(t); setUser(JSON.parse(u)); }
      } catch { /* ignore corrupt storage */ }
      setReady(true);
    })();
  }, []);

  const signIn = useCallback(async (res: AuthResponse, remember = true) => {
    setAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);
    if (remember) {
      await SecureStore.setItemAsync(TOKEN_KEY, res.token).catch(() => undefined);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.user)).catch(() => undefined);
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
    await AsyncStorage.removeItem(USER_KEY).catch(() => undefined);
  }, []);

  const updateUser = useCallback((u: Partial<User>) => {
    setUser((prev) => {
      const next = prev ? { ...prev, ...u } : prev;
      if (next) AsyncStorage.setItem(USER_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ user, token, ready, signIn, signOut, updateUser }), [user, token, ready, signIn, signOut, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
