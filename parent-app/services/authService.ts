/**
 * Auth service for parent mobile app.
 * JWT: loginRequest / registerRequest for email+password.
 * Legacy: requestLoginCode / verifyLoginCode for phone+code (dev fallback).
 */

import { apiFetch } from "@/lib/api";
import type { ParentUser } from "@/types/auth";

export interface AuthLoginResponse {
  token: string;
  parent: { id: number; email: string };
}

/** POST /api/auth/login — returns { token, parent }. */
export async function loginRequest(email: string, password: string): Promise<AuthLoginResponse> {
  return apiFetch<AuthLoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/** POST /api/auth/register — returns { token, parent }. */
export async function registerRequest(email: string, password: string): Promise<AuthLoginResponse> {
  return apiFetch<AuthLoginResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

const DEV_CODE = "1234";

/** Request SMS code. In dev: always succeeds (no-op). */
export async function requestLoginCode(phone: string): Promise<void> {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw new Error("Введите номер телефона");
  }

  try {
    await apiFetch<{ ok: boolean }>("/api/parent/mobile/auth/request-code", {
      method: "POST",
      body: JSON.stringify({ phone: normalized }),
    });
  } catch {
    if (isDevMode()) {
      return; // Dev: backend route may not exist, proceed to code step
    }
    throw new Error("Не удалось отправить код. Попробуйте позже.");
  }
}

/** Verify code and return user. In dev: code 1234 signs in. */
export async function verifyLoginCode(phone: string, code: string): Promise<ParentUser> {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw new Error("Введите номер телефона");
  }
  if (!code.trim()) {
    throw new Error("Введите код подтверждения");
  }

  try {
    const res = await apiFetch<{ user: ParentUser; token?: string }>(
      "/api/parent/mobile/auth/verify",
      {
        method: "POST",
        body: JSON.stringify({ phone: normalized, code: code.trim() }),
      }
    );
    return res.user;
  } catch (e) {
    if (isDevMode()) {
      if (code.trim() === DEV_CODE) {
        return {
          id: `parent-${normalized}`,
          phone: normalized,
          name: "Юрий Голыш",
          role: "Родитель",
        };
      }
      throw new Error("Неверный код");
    }
    if (e instanceof Error && (e.message.includes("401") || e.message.includes("Неверный"))) {
      throw new Error("Неверный код");
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
  return phone.replace(/\D/g, "").trim();
}

function isDevMode(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__;
}
