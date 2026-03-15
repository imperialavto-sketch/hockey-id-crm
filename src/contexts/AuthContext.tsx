"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type UserRole = "SCHOOL_ADMIN" | "MAIN_COACH" | "COACH" | "SCHOOL_MANAGER" | "PARENT";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId: string | null;
  school?: { id: string; name: string };
}

export type LoginResult = { ok: true } | { ok: false; error: string };

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("hockey-crm-user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("hockey-crm-user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = res.status === 401
          ? "Неверный email или пароль"
          : "Не удалось войти. Попробуйте снова.";
        return { ok: false, error: message };
      }
      const u = { ...data.user, role: data.role || data.user.role };
      setUser(u);
      localStorage.setItem("hockey-crm-user", JSON.stringify(u));
      fetch("/api/settings/login-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: u.id,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        }),
      }).catch(() => {});
      return { ok: true };
    } catch {
      return { ok: false, error: "Не удалось войти. Попробуйте снова." };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("hockey-crm-user");
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
