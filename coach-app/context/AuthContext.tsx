/**
 * Auth context for Hockey ID Coach App.
 * Stores token in SecureStore, wires setAuthToken for API client.
 * Demo mode: auto-login with coach@hockey.edu / admin123 if no stored session.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { setAuthToken, setUnauthorizedHandler } from '@/lib/api';
import { clearCoachDevTokenCache } from '@/lib/coachAuth';
import { clearCoachPlayersCache } from '@/lib/coachPlayersCache';
import { API_BASE_URL, isDemoMode } from '@/lib/config';

const TOKEN_KEY = 'coach_auth_token';
const USER_KEY = 'coach_auth_user';

const DEMO_EMAIL = 'coach@hockey.edu';
const DEMO_PASSWORD = 'admin123';

export interface CoachUser {
  id: string;
  email?: string;
  name?: string;
  role: string;
}

interface AuthContextValue {
  user: CoachUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: CoachUser) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function demoAutoLogin(): Promise<{ token: string; user: CoachUser } | null> {
  if (isDemoMode) {
    return {
      token: 'demo-mock-token',
      user: {
        id: 'demo-coach',
        email: DEMO_EMAIL,
        name: 'Demo Coach',
        role: 'coach',
      },
    };
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.mobileToken && data?.user) {
      return { token: data.mobileToken, user: data.user };
    }
  } catch {
    /* Demo backend may be unavailable */
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CoachUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuthState = useCallback(async (restoreDemo = false) => {
    clearCoachDevTokenCache();
    clearCoachPlayersCache();
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setTokenState(null);
    setUser(null);
    setAuthToken(null);

    if (restoreDemo && isDemoMode) {
      const demo = await demoAutoLogin();
      if (demo) {
        await SecureStore.setItemAsync(TOKEN_KEY, demo.token);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(demo.user));
        setTokenState(demo.token);
        setUser(demo.user);
        setAuthToken(demo.token);
      }
    }
  }, []);

  const persistAuthSession = useCallback(async (nextUser: CoachUser, nextToken: string) => {
    const normalizedToken = String(nextToken ?? '').trim();
    if (!normalizedToken) {
      throw new Error('Не удалось выполнить вход: сервер не вернул токен');
    }
    await SecureStore.setItemAsync(TOKEN_KEY, normalizedToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser));
    setTokenState(normalizedToken);
    setUser(nextUser);
    setAuthToken(normalizedToken);
  }, []);

  const loadToken = useCallback(async () => {
    try {
      const [storedToken, storedUserRaw] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);
      let parsedUser: CoachUser | null = null;
      if (storedUserRaw) {
        try {
          parsedUser = JSON.parse(storedUserRaw) as CoachUser;
        } catch {
          /* ignore */
        }
      }
      if (storedToken && parsedUser) {
        setTokenState(storedToken);
        setUser(parsedUser);
        setAuthToken(storedToken);
      } else if (isDemoMode) {
        const demo = await demoAutoLogin();
        if (demo) {
          await SecureStore.setItemAsync(TOKEN_KEY, demo.token);
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(demo.user));
          setTokenState(demo.token);
          setUser(demo.user);
          setAuthToken(demo.token);
        } else {
          setAuthToken(null);
        }
      } else {
        setAuthToken(null);
      }
    } catch {
      setAuthToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  useEffect(() => {
    setUnauthorizedHandler(() => clearAuthState(isDemoMode));
    return () => setUnauthorizedHandler(null);
  }, [clearAuthState]);

  const login = useCallback(
    async (newToken: string, newUser: CoachUser) => {
      await persistAuthSession(newUser, newToken);
    },
    [persistAuthSession]
  );

  const logout = useCallback(async () => {
    await clearAuthState(isDemoMode);
  }, [clearAuthState]);

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
