import { isDemoMode, enableApiFallback } from "@/config/api";

/**
 * Unified live→demo fallback helper for data services.
 *
 * - In demo mode: always returns demo data (fallback()).
 * - In live mode: uses apiCall(); on error, propagates (no silent demo substitution)
 *   unless EXPO_PUBLIC_ENABLE_API_FALLBACK=true is set (explicit opt-in for dev).
 */
export async function withFallback<T>(
  apiCall: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  if (isDemoMode) {
    if (__DEV__) {
      console.log("[data] demo mode active → using demo data");
    }
    return fallback();
  }

  try {
    const result = await apiCall();
    if (__DEV__) {
      console.log("[data] api mode success");
    }
    return result;
  } catch (err) {
    if (enableApiFallback) {
      if (__DEV__) {
        console.warn("[data] api failed, fallback to demo (EXPO_PUBLIC_ENABLE_API_FALLBACK=true)", err);
      }
      return fallback();
    }
    throw err;
  }
}

