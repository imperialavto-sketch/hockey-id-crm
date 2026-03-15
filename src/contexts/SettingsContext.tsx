"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light";
export type ColorScheme = "neon" | "classic" | "minimal";

export interface UserSettingsData {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  theme?: string;
  colorScheme?: string;
  googleCalendarSync?: boolean;
  paymentSystem?: string | null;
  analyticsService?: string | null;
  twoFactorEnabled?: boolean;
}

interface SettingsContextType {
  settings: UserSettingsData | null;
  theme: Theme;
  colorScheme: ColorScheme;
  setSettings: (s: UserSettingsData | null) => void;
  applyTheme: (theme: Theme, colorScheme?: ColorScheme) => void;
}

const defaultSettings: UserSettingsData = {
  theme: "dark",
  colorScheme: "neon",
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettingsData | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const [colorScheme, setColorScheme] = useState<ColorScheme>("neon");

  const applyTheme = (t: Theme, cs?: ColorScheme) => {
    setTheme(t);
    if (cs) setColorScheme(cs);
    const root = document.documentElement;
    if (t === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
      root.style.setProperty("--foreground", "#1e293b");
      root.style.setProperty("--background", "#f8fafc");
      root.style.setProperty("--card-bg", "rgba(255,255,255,0.9)");
      root.style.setProperty("--accent", "#2563eb");
      root.style.setProperty("--neon-blue", "#2563eb");
      root.style.setProperty("--neon-pink", "#dc2626");
      root.style.setProperty("--neon-green", "#059669");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
      root.style.setProperty("--foreground", "#e2e8f0");
      root.style.setProperty("--background", "#0a0a0f");
      root.style.setProperty("--card-bg", "rgba(26, 26, 36, 0.8)");
      root.style.setProperty("--accent", "#00d4ff");
      root.style.setProperty("--neon-blue", cs === "neon" ? "#00d4ff" : cs === "classic" ? "#3b82f6" : "#94a3b8");
      root.style.setProperty("--neon-pink", cs === "neon" ? "#ff00aa" : "#dc2626");
      root.style.setProperty("--neon-green", cs === "neon" ? "#00ff88" : "#059669");
    }
    try {
      localStorage.setItem("hockey-crm-theme", t);
      localStorage.setItem("hockey-crm-colorScheme", cs ?? colorScheme);
    } catch {}
  };

  useEffect(() => {
    if (!settings) return;
    const t = (settings.theme as Theme) || "dark";
    const cs = (settings.colorScheme as ColorScheme) || "neon";
    setTheme(t);
    setColorScheme(cs);
    const root = document.documentElement;
    if (t === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
      root.style.setProperty("--foreground", "#1e293b");
      root.style.setProperty("--background", "#f8fafc");
      root.style.setProperty("--card-bg", "rgba(255,255,255,0.9)");
      root.style.setProperty("--neon-blue", cs === "neon" ? "#2563eb" : cs === "classic" ? "#3b82f6" : "#64748b");
      root.style.setProperty("--neon-pink", "#dc2626");
      root.style.setProperty("--neon-green", "#059669");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
      root.style.setProperty("--foreground", "#e2e8f0");
      root.style.setProperty("--background", "#0a0a0f");
      root.style.setProperty("--card-bg", "rgba(26, 26, 36, 0.8)");
      root.style.setProperty("--neon-blue", cs === "neon" ? "#00d4ff" : cs === "classic" ? "#3b82f6" : "#94a3b8");
      root.style.setProperty("--neon-pink", cs === "neon" ? "#ff00aa" : "#dc2626");
      root.style.setProperty("--neon-green", cs === "neon" ? "#00ff88" : "#059669");
    }
    try {
      localStorage.setItem("hockey-crm-theme", t);
      localStorage.setItem("hockey-crm-colorScheme", cs);
    } catch {}
  }, [settings?.theme, settings?.colorScheme]);

  useEffect(() => {
    try {
      const t = localStorage.getItem("hockey-crm-theme") as Theme | null;
      const cs = localStorage.getItem("hockey-crm-colorScheme") as ColorScheme | null;
      if (t) setTheme(t);
      if (cs) setColorScheme(cs);
    } catch {}
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, theme, colorScheme, setSettings, applyTheme }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) return { settings: null, theme: "dark" as Theme, colorScheme: "neon" as ColorScheme, setSettings: () => {}, applyTheme: () => {} };
  return ctx;
}
