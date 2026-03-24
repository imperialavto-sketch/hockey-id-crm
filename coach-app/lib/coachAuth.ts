/**
 * Coach API auth — production-ready layer for live coach services.
 * Production: Bearer only, throws if no token.
 * Dev: Bearer or empty headers (backend returns 401, handled by UI).
 * NOTE: Backend does NOT support x-coach-id or dev-token; dev without login gets 401.
 */

import { getAuthToken, isApi401 } from './api';
import { isProduction } from './config';

/** Thrown when auth required but unavailable (production, no token). */
export class CoachAuthRequiredError extends Error {
  constructor() {
    super('Требуется авторизация');
    this.name = 'CoachAuthRequiredError';
  }
}

/**
 * Get headers for coach API calls.
 * Production: Bearer only. Throws CoachAuthRequiredError if no app token.
 * Dev: Bearer if available, else {} — request proceeds, backend returns 401.
 */
export async function getCoachAuthHeaders(): Promise<Record<string, string>> {
  const appToken = getAuthToken();
  if (appToken) {
    return { Authorization: `Bearer ${appToken}` };
  }

  if (isProduction) {
    throw new CoachAuthRequiredError();
  }

  // Dev without token: no auth headers, backend returns 401 (handled by screens via isAuthRequiredError)
  return {};
}

/** No-op for backward compat. Dev-token removed — endpoint never existed. */
export function clearCoachDevTokenCache(): void {
  /* no-op */
}

/** Use for consistent "Требуется авторизация" message: 401 from API or CoachAuthRequiredError. */
export function isAuthRequiredError(err: unknown): boolean {
  return isApi401(err) || err instanceof CoachAuthRequiredError;
}
