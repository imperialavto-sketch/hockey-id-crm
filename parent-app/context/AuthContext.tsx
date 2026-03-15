"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ParentUser } from "@/types/auth";
import { setAuthToken } from "@/lib/api";
import {
  requestLoginCode as apiRequestCode,
  verifyLoginCode as apiVerifyCode,
  logout as apiLogout,
} from "@/services/authService";

const AUTH_STORAGE_KEY = "@hockey_parent_auth";
const TOKEN_KEY = "token";
const USER_KEY = "auth_user";

interface AuthSession {
  user: ParentUser;
}

interface AuthContextValue {
  user: ParentUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** JWT login: store token and parent from backend. */
  login: (token: string, parent: { id: number; email: string }) => Promise<void>;
  logout: () => Promise<void>;
  requestCode: (phone: string) => Promise<void>;
  verifyCode: (phone: string, code: string) => Promise<void>;
}

function parentToUser(parent: { id: number; email: string }): ParentUser {
  return {
    id: String(parent.id),
    name: parent.email || "Родитель",
    role: "Родитель",
    email: parent.email,
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ParentUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadToken = useCallback(async () => {
    if (__DEV__) console.time("[Auth] loadToken");
    try {
      const [storedToken, storedUser] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);
      if (storedToken && storedUser) {
        const parent = JSON.parse(storedUser) as { id: number; email: string };
        setTokenState(storedToken);
        setUser(parentToUser(parent));
        setAuthToken(storedToken);
      } else {
        setAuthToken(null);
      }
      // Fallback: legacy AsyncStorage session (phone/code flow)
      const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (!storedToken && raw) {
        const session: AuthSession = JSON.parse(raw);
        if (session?.user) setUser(session.user);
      }
    } catch {
      setAuthToken(null);
    } finally {
      if (__DEV__) console.timeEnd("[Auth] loadToken");
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  const login = useCallback(async (newToken: string, parent: { id: number; email: string }) => {
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(parent));
    setTokenState(newToken);
    setUser(parentToUser(parent));
    setAuthToken(newToken);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    setTokenState(null);
    setUser(null);
    setAuthToken(null);
  }, []);

  const persistSession = useCallback(async (u: ParentUser) => {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: u }));
    setUser(u);
  }, []);

  const requestCode = useCallback(async (phone: string) => {
    await apiRequestCode(phone);
  }, []);

  const verifyCode = useCallback(
    async (phone: string, code: string) => {
      const u = await apiVerifyCode(phone, code);
      await persistSession(u);
    },
    [persistSession]
  );

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: !!user || !!token,
    isLoading,
    login,
    logout,
    requestCode,
    verifyCode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
