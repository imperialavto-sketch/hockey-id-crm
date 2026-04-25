/**
 * API config for Hockey ID Coach App.
 *
 * Источник base URL (в порядке приоритета):
 * 1. process.env.EXPO_PUBLIC_API_URL (Expo / .env)
 * 2. иначе http://localhost:3000 (локальная разработка)
 *
 * Все запросы идут на один origin: `${API_BASE_URL}/api/...` (см. lib/api.ts).
 * Бэкенд должен отдавать и auth/coach-маршруты, и тренировки, в том числе:
 * - GET/POST /api/trainings/:id/evaluations
 * - GET/POST /api/trainings/:id/report
 * - GET/POST /api/trainings/:id/attendance (и пр.)
 *
 * Канонический backend для coach-app — развёрнутый Next CRM (тот же репозиторий).
 * Другой origin допустим только если это прокси на тот же Next API, не legacy Express hockey-server.
 */

const ENV = process.env;

/** Local Next.js CRM. For physical devices use your machine IP (e.g. http://192.168.1.x:3000). */
const FALLBACK_URL = 'http://localhost:3000';

export const isDemoMode: boolean =
  (ENV.EXPO_PUBLIC_DEMO_MODE ?? '').toLowerCase() === 'true';

/** Production: only Bearer. Dev: Bearer or 401 when no token. */
export const isProduction: boolean =
  (ENV.EXPO_PUBLIC_ENV ?? '').toLowerCase() === 'production';

function resolveApiBaseUrl(): string {
  const explicit = ENV.EXPO_PUBLIC_API_URL?.trim();
  if (isProduction && !explicit) {
    throw new Error(
      "[Coach App] EXPO_PUBLIC_API_URL is required for production builds."
    );
  }
  return explicit || FALLBACK_URL;
}

export const API_BASE_URL: string = resolveApiBaseUrl().replace(/\/$/, '');

/** True when API URL is localhost. Physical devices need machine IP instead. */
export const isLocalhostUrl: boolean =
  /^https?:\/\/localhost(:\d+)?(\/|$)/i.test(API_BASE_URL) ||
  /^https?:\/\/127\.0\.0\.1(:\d+)?(\/|$)/i.test(API_BASE_URL);

if (typeof __DEV__ !== 'undefined' && __DEV__ && isLocalhostUrl) {
  console.warn(
    '[Coach App] API_BASE_URL uses localhost. On a physical device, set EXPO_PUBLIC_API_URL to your machine IP (e.g. http://192.168.1.x:3000).'
  );
}

export const API_TIMEOUT_MS = Number(ENV.EXPO_PUBLIC_API_TIMEOUT_MS ?? 10000) || 10000;
