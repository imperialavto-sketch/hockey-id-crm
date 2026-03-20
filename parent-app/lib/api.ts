/**
 * Central API client for Hockey ID Parent App.
 * Uses API_BASE_URL from config/api.
 */

import { API_BASE_URL } from "@/config/api";

const BASE = API_BASE_URL.replace(/\/$/, "");

let authToken: string | null = null;
let unauthorizedHandler: (() => void | Promise<void>) | null = null;
let unauthorizedHandlerPromise: Promise<void> | null = null;

/** Set the JWT for authenticated API requests. Call from AuthContext on login/logout/load. */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/** Register a global 401 handler. AuthContext should call this once. */
export function setUnauthorizedHandler(handler: (() => void | Promise<void>) | null): void {
  unauthorizedHandler = handler;
}

const DEFAULT_TIMEOUT_MS = 5000;
const RETRY_DELAYS_MS = [500];

export interface ApiError {
  error: string;
  details?: string;
  code?: string;
}

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export function getApiBase(): string {
  return BASE;
}

export { API_BASE_URL };

export interface ApiFetchOptions extends RequestInit {
  /** Timeout in ms. Default 15000. */
  timeoutMs?: number;
}

async function handleUnauthorized(): Promise<void> {
  if (!unauthorizedHandler) return;
  if (!unauthorizedHandlerPromise) {
    unauthorizedHandlerPromise = Promise.resolve(unauthorizedHandler())
      .catch(() => {
        // Ignore logout cleanup failures - original 401 should still propagate.
      })
      .finally(() => {
        unauthorizedHandlerPromise = null;
      });
  }

  await unauthorizedHandlerPromise;
}

async function doFetch<T>(url: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  const method = init.method ?? "GET";
  const requestBody =
    typeof init.body === "string"
      ? init.body
      : init.body
        ? "[non-string body]"
        : undefined;

  if (__DEV__) {
    console.log("API REQUEST URL:", url);
    console.log("API REQUEST METHOD:", method);
    console.log("API REQUEST BODY:", requestBody ?? null);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers,
      credentials: "include",
    });
  } catch (err) {
    clearTimeout(timeout);
    if (__DEV__) {
      console.warn("API ERROR:", err instanceof Error ? err.message : String(err));
    }
    throw err;
  }

  clearTimeout(timeout);

  if (__DEV__) {
    console.log("[API] RESPONSE", url, `${Date.now() - start}ms`, res.status);
  }

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    if (__DEV__) {
      console.warn("[api] Invalid JSON response from", url, "status:", res.status);
      console.warn("[api] Raw response (first 500 chars):", text?.slice(0, 500) ?? "(empty)");
    }
    throw new Error("Неверный ответ сервера");
  }

  if (!res.ok) {
    const shouldLogoutOn401 =
      res.status === 401 &&
      authToken &&
      !url.includes("/api/chat/ai/");
    if (shouldLogoutOn401) {
      if (__DEV__) {
        console.log("[api] 401 → triggering handleUnauthorized (logout)", url);
      }
      await handleUnauthorized();
    } else if (res.status === 401 && authToken && __DEV__) {
      console.log("[api] 401 on Coach Mark/chat — NOT logging out", url);
    }
    const err = data as ApiError;
    throw new ApiRequestError(err?.error ?? `Ошибка ${res.status}`, res.status);
  }

  return data as T;
}

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // Do not retry timeout - fail fast
  if (err.name === "AbortError") return false;
  return (
    err.message?.includes("Network request failed") ||
    err.message?.includes("Failed to fetch") ||
    err.message?.includes("Сервер недоступен")
  );
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options;
  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const attempt = async (attemptIndex: number): Promise<T> => {
    try {
      return await doFetch<T>(url, init, timeoutMs);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          if (__DEV__) console.warn("[api] Request timeout:", url);
          throw new Error("Превышено время ожидания");
        }
        if (err.message?.includes("Network request failed") || err.message?.includes("Failed to fetch")) {
          console.error("[api] Network request failed:", url, err.message);
          throw new Error("Сервер недоступен. Проверьте EXPO_PUBLIC_API_URL в .env и что сервер запущен.");
        }
      }
      throw err;
    }
  };

  let lastErr: unknown;
  for (let i = 0; i <= RETRY_DELAYS_MS.length; i++) {
    try {
      return await attempt(i);
    } catch (err) {
      lastErr = err;
      if (!isRetryableError(err) || i >= RETRY_DELAYS_MS.length) {
        throw err;
      }
      const delayMs = RETRY_DELAYS_MS[i];
      if (__DEV__) console.log(`[API] RETRY ${i + 1}/${RETRY_DELAYS_MS.length} after ${delayMs}ms:`, url);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}
