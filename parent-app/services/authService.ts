/**
 * Auth service for parent mobile app.
 * JWT: loginRequest / registerRequest for email+password.
 * Legacy: requestLoginCode / verifyLoginCode for phone+code (dev fallback).
 */

import { apiFetch, getApiBase } from "@/lib/api";
import type { ParentUser } from "@/types/auth";
import { isDemoMode, API_BASE_URL } from "@/config/api";
import { DEMO_AUTH_TOKEN, demoParentUser } from "@/demo/demoAuth";

export interface AuthLoginResponse {
  token: string;
  parent: { id: number; email: string };
}

export interface VerifyLoginResponse {
  user: ParentUser;
  token: string;
}

function mapBackendUser(user: ParentUser, normalizedPhone: string): ParentUser {
  return {
    ...user,
    id: String(user.id),
    phone: user.phone ?? normalizedPhone,
    name: user.name ?? user.email ?? "Родитель",
    role: user.role === "PARENT" ? "Родитель" : user.role || "Родитель",
  };
}

/** POST /api/auth/login — returns { token, parent }. */
export async function loginRequest(email: string, password: string): Promise<AuthLoginResponse> {
  if (isDemoMode) {
    return {
      token: DEMO_AUTH_TOKEN,
      parent: { id: Number(demoParentUser.id.replace(/\D/g, "") || 1), email },
    };
  }
  return apiFetch<AuthLoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/** POST /api/auth/register — returns { token, parent }. */
export async function registerRequest(email: string, password: string): Promise<AuthLoginResponse> {
  if (isDemoMode) {
    return {
      token: DEMO_AUTH_TOKEN,
      parent: { id: Number(demoParentUser.id.replace(/\D/g, "") || 1), email },
    };
  }
  return apiFetch<AuthLoginResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/** Request SMS code from backend. Demo mode: no-op. */
export async function requestLoginCode(phone: string): Promise<void> {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw new Error("Введите номер телефона");
  }

  if (isDemoMode) {
    return;
  }

  const path = "/api/parent/mobile/auth/request-code";
  const apiBase = getApiBase();
  const fullUrl = `${apiBase.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

  if (__DEV__) console.log("[auth] request-code", fullUrl);

  try {
    const res = await apiFetch<{ ok?: boolean }>(path, {
      method: "POST",
      body: JSON.stringify({ phone: normalized }),
      timeoutMs: 30000, // Render cold start ~25s; default 5s too short
    });
  } catch (e) {
    if (__DEV__) console.warn("[auth] request-code failed:", e instanceof Error ? e.message : e);
    throw new Error(e instanceof Error ? e.message : "Не удалось отправить код. Попробуйте позже.");
  }
}

/** Verify code via backend and return user + token. Demo mode: explicit demo session only. */
export async function verifyLoginCode(phone: string, code: string): Promise<VerifyLoginResponse> {
  const normalized = normalizePhone(phone);
  const trimmedCode = code.trim();
  if (!normalized) {
    throw new Error("Введите номер телефона");
  }
  if (!trimmedCode) {
    throw new Error("Введите код подтверждения");
  }

  if (isDemoMode) {
    return {
      user: {
        id: demoParentUser.id,
        phone: normalized,
        name: demoParentUser.name,
        role: demoParentUser.role,
        email: demoParentUser.email,
      },
      token: DEMO_AUTH_TOKEN,
    };
  }

  const path = "/api/parent/mobile/auth/verify";
  const apiBase = getApiBase();
  const fullUrl = `${apiBase.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const requestBody = { phone: normalized, code: trimmedCode };

  if (__DEV__) console.log("[auth] verify", fullUrl);

  try {
    const res = await apiFetch<VerifyLoginResponse>(path, {
      method: "POST",
      body: JSON.stringify(requestBody),
      timeoutMs: 30000, // Render cold start ~25s; default 5s too short
    });
    if (!res?.user) {
      throw new Error("Не удалось выполнить вход");
    }

    const token = typeof res?.token === "string" ? res.token.trim() : "";
    if (!token) {
      throw new Error("Не удалось выполнить вход: сервер не вернул токен");
    }

    return {
      user: mapBackendUser(res.user, normalized),
      token,
    };
  } catch (e) {
    if (__DEV__) console.warn("[auth] verify failed:", e instanceof Error ? e.message : e);
    if (e instanceof Error && e.message.includes("сервер не вернул токен")) {
      throw e;
    }
    if (e instanceof Error && (e.message.includes("401") || e.message.includes("Неверный"))) {
      throw new Error("Неверный код");
    }
    if (e instanceof Error && (e.message.includes("404") || e.message.includes("Parent not found"))) {
      throw new Error("Пользователь не найден");
    }
    if (e instanceof Error && (e.message.includes("409") || e.message.includes("duplicated"))) {
      throw new Error("Номер телефона привязан к нескольким профилям");
    }
    throw new Error("Не удалось выполнить вход");
  }
}

/** Logout - clear server session if needed. */
export async function logout(): Promise<void> {
  try {
    await apiFetch("/api/parent/mobile/auth/logout", { method: "POST" });
  } catch {
    // Ignore - local cleanup is sufficient
  }
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").trim();
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("8")) {
    return `7${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    return `7${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("7")) {
    return digits;
  }
  return "";
}
