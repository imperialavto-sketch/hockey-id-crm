"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ParentUser } from "@/types/auth";
import { setAuthToken, setUnauthorizedHandler } from "@/lib/api";
import {
  requestLoginCode as apiRequestCode,
  verifyLoginCode as apiVerifyCode,
  logout as apiLogout,
} from "@/services/authService";
import { clearPlayerRelatedStorage } from "@/lib/playerStorage";
import { isDemoMode } from "@/config/api";
import { DEMO_AUTH_TOKEN, demoParentUser } from "@/demo/demoAuth";

const AUTH_STORAGE_KEY = "@hockey_parent_auth";
const TOKEN_KEY = "token";
const USER_KEY = "auth_user";

interface AuthSession {
  user: ParentUser;
  token?: string;
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
  /** Dev-only helper to fully reset auth state (SecureStore + AsyncStorage). */
  resetAllAuthStateForDev?: () => Promise<void>;
}

function parentToUser(parent: { id: number; email: string }): ParentUser {
  return {
    id: String(parent.id),
    name: parent.email || "Родитель",
    role: "Родитель",
    email: parent.email,
  };
}

function parseStoredUser(raw: string | null): ParentUser | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ParentUser | { id: number; email: string };
    if (parsed && typeof parsed === "object") {
      if ("role" in parsed && typeof parsed.id !== "undefined") {
        return {
          ...parsed,
          id: String(parsed.id),
        } as ParentUser;
      }

      if ("email" in parsed && typeof parsed.id !== "undefined" && typeof parsed.email === "string") {
        return parentToUser({
          id: Number(parsed.id),
          email: parsed.email,
        });
      }
    }
  } catch {
    return null;
  }

  return null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ParentUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuthState = useCallback(async (restoreDemo = false) => {
    if (__DEV__) {
      console.log("[Auth] clearAuthState CALLED", { restoreDemo, stack: new Error().stack?.split("\n").slice(1, 4).join("\n") });
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    await clearPlayerRelatedStorage();
    setTokenState(null);
    setUser(null);
    setAuthToken(null);

    if (restoreDemo && isDemoMode) {
      setTokenState(DEMO_AUTH_TOKEN);
      setUser(demoParentUser);
      setAuthToken(DEMO_AUTH_TOKEN);
    }
  }, []);

  const persistAuthSession = useCallback(async (nextUser: ParentUser, nextToken: string) => {
    const normalizedToken = String(nextToken ?? "").trim();
    if (!normalizedToken) {
      throw new Error("Не удалось выполнить вход: сервер не вернул токен");
    }

    await SecureStore.setItemAsync(TOKEN_KEY, normalizedToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser));
    await AsyncStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ user: nextUser, token: normalizedToken } satisfies AuthSession)
    );
    setTokenState(normalizedToken);
    setUser(nextUser);
    setAuthToken(normalizedToken);
  }, []);

  const loadToken = useCallback(async () => {
    if (__DEV__) {
      console.time("[Auth] loadToken");
      console.log("[Auth] loadToken start");
    }
    try {
      const [storedToken, storedUser] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);
      const parsedStoredUser = parseStoredUser(storedUser);
      if (storedToken && parsedStoredUser) {
        setTokenState(storedToken);
        setUser(parsedStoredUser);
        setAuthToken(storedToken);
        if (__DEV__) {
          console.log("[Auth] restored JWT session from SecureStore", {
            parentId: parsedStoredUser.id,
            email: parsedStoredUser.email,
          });
        }
      } else if (isDemoMode) {
        // Demo mode: hydrate built-in demo parent without backend.
        setTokenState(DEMO_AUTH_TOKEN);
        setUser(demoParentUser);
        setAuthToken(DEMO_AUTH_TOKEN);
        if (__DEV__) {
          console.log("[Auth] using demo auth session");
        }
      } else {
        setAuthToken(null);
      }
      // Fallback: legacy AsyncStorage session (phone/code flow)
      const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (!storedToken && raw) {
        const session: AuthSession = JSON.parse(raw);
        const sessionToken =
          typeof session?.token === "string" ? session.token.trim() : "";
        if (session?.user && sessionToken) {
          setUser(session.user);
          setTokenState(sessionToken);
          setAuthToken(sessionToken);
          if (__DEV__) {
            console.log("[Auth] restored phone auth session from AsyncStorage", {
              parentId: session.user.id,
              phone: session.user.phone,
            });
          }
        }
      }
    } catch {
      setAuthToken(null);
    } finally {
      if (__DEV__) {
        console.timeEnd("[Auth] loadToken");
        console.log("[Auth] loadToken done");
      }
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  useEffect(() => {
    setUnauthorizedHandler(() => clearAuthState(false));
    return () => setUnauthorizedHandler(null);
  }, [clearAuthState]);

  const login = useCallback(async (newToken: string, parent: { id: number; email: string }) => {
    await persistAuthSession(parentToUser(parent), newToken);
  }, [persistAuthSession]);

  const logout = useCallback(async () => {
    await apiLogout();
    await clearAuthState(isDemoMode);
  }, [clearAuthState]);

  const requestCode = useCallback(async (phone: string) => {
    if (__DEV__) {
      console.log("[Auth] requestCode start", { phone });
    }
    try {
      await apiRequestCode(phone);
      if (__DEV__) {
        console.log("[Auth] requestCode success", { phone });
      }
    } catch (e) {
      if (__DEV__) {
        console.warn("[Auth] requestCode error", e);
      }
      throw e;
    }
  }, []);

  const verifyCode = useCallback(
    async (phone: string, code: string) => {
      if (__DEV__) {
        console.log("[Auth] verifyCode start", { phone });
      }
      try {
        const { user: verifiedUser, token: verifiedToken } = await apiVerifyCode(phone, code);
        await persistAuthSession(verifiedUser, verifiedToken);
        if (__DEV__) {
          console.log("[Auth] verifyCode success", {
            userId: verifiedUser.id,
            phone: verifiedUser.phone,
            hasToken: !!verifiedToken,
          });
        }
      } catch (e) {
        if (__DEV__) {
          console.warn("[Auth] verifyCode error", e);
        }
        throw e;
      }
    },
    [persistAuthSession]
  );

  const resetAllAuthStateForDev = useCallback(async () => {
    if (!__DEV__) return;
    try {
      console.log("[Auth] resetAllAuthStateForDev: clearing storage");
      await clearAuthState(false);
    } catch (e) {
      console.warn("[Auth] resetAllAuthStateForDev error", e);
    }
  }, [clearAuthState]);

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    logout,
    requestCode,
    verifyCode,
    resetAllAuthStateForDev,
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
