/**
 * API client for Hockey ID Coach App.
 * Uses API_BASE_URL from lib/config.
 * Auth: setAuthToken() called from AuthContext on login/restore/logout.
 */

import { API_BASE_URL, API_TIMEOUT_MS } from './config';

let authToken: string | null = null;
let unauthorizedHandler: (() => void | Promise<void>) | null = null;

/** Set token for authenticated requests. Call from AuthContext. */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

/** Register 401 handler. AuthContext calls this to clear session on 401. */
export function setUnauthorizedHandler(handler: (() => void | Promise<void>) | null): void {
  unauthorizedHandler = handler;
}

export interface ApiError {
  error: string;
  details?: string;
}

function pickApiErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const d = data as Record<string, unknown>;
  const e = d.error;
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return fallback;
}

export class ApiRequestError extends Error {
  status: number;
  /** Parsed JSON body from a non-2xx response, when available. */
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.body = body;
  }
}

export function isApi404(err: unknown): err is ApiRequestError {
  return err instanceof ApiRequestError && err.status === 404;
}

export function isApi409(err: unknown): err is ApiRequestError {
  return err instanceof ApiRequestError && err.status === 409;
}

export function isApi401(err: unknown): err is ApiRequestError {
  return err instanceof ApiRequestError && err.status === 401;
}

export function isApi422(err: unknown): err is ApiRequestError {
  return err instanceof ApiRequestError && err.status === 422;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = API_TIMEOUT_MS, ...init } = options;
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
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
      credentials: 'include',
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new ApiRequestError('Превышено время ожидания', 408);
      }
      if (
        err.message?.includes('Network request failed') ||
        err.message?.includes('Failed to fetch')
      ) {
        throw new ApiRequestError(
          'Сервер недоступен. Проверьте EXPO_PUBLIC_API_URL в .env.',
          0
        );
      }
    }
    throw err;
  }
  clearTimeout(timeout);

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiRequestError('Неверный ответ сервера', res.status);
  }

  if (!res.ok) {
    if (res.status === 401 && authToken && unauthorizedHandler) {
      try {
        await Promise.resolve(unauthorizedHandler());
      } catch {
        /* ignore */
      }
    }
    const message = pickApiErrorMessage(data, `Ошибка ${res.status}`);
    throw new ApiRequestError(message, res.status, data);
  }

  return data as T;
}
