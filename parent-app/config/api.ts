/**
 * API config. Single source of truth for:
 * - base URL
 * - demo/live mode
 * - API timeout and fallback flags
 *
 * All env reads must go through this file.
 */

import { Platform } from "react-native";

const ENV = process.env;

const LIVE_BACKEND_URL = "https://hockey-server-api.onrender.com";

/**
 * API URL for physical device / Expo Go (non-web).
 * Override via EXPO_PUBLIC_DEVICE_API_URL or EXPO_PUBLIC_API_URL in .env.
 * Fallback: live backend.
 */
const DEVICE_API_BASE_URL =
  ENV.EXPO_PUBLIC_DEVICE_API_URL?.trim() ||
  ENV.EXPO_PUBLIC_API_URL?.trim() ||
  LIVE_BACKEND_URL;

/** true when running in development (__DEV__) */
export const isDev = typeof __DEV__ !== "undefined" && __DEV__;

/**
 * Demo mode flag.
 * When true, app prefers demo data and can sign in with demo session
 * even если backend недоступен.
 */
export const isDemoMode: boolean =
  (ENV.EXPO_PUBLIC_DEMO_MODE ?? "").toLowerCase() === "true";

/**
 * Controls whether services are allowed to fallback to demo data
 * when live API fails. Only applies when isDemoMode is false.
 *
 * Default: false — live mode propagates API errors for honest integration testing.
 * Set EXPO_PUBLIC_ENABLE_API_FALLBACK=true to allow demo fallback on API failure (dev only).
 */
export const enableApiFallback: boolean =
  (ENV.EXPO_PUBLIC_ENABLE_API_FALLBACK ?? "false").toLowerCase() === "true";

/**
 * Base URL for the Hockey ID backend.
 * Prefer EXPO_PUBLIC_API_URL so app can point to the current hockey-server.
 * Examples:
 * - same computer/simulator: http://localhost:3000
 * - physical device: http://192.168.X.X:3000
 */
function resolveApiBaseUrl(): string {
  const explicit = ENV.EXPO_PUBLIC_API_URL?.trim();

  // Local Expo/device flow should hit the LAN hockey-server directly.
  if (Platform.OS !== "web" && isDev) {
    return DEVICE_API_BASE_URL;
  }

  const url = explicit || LIVE_BACKEND_URL;
  if (!explicit && !isDev && typeof __DEV__ !== "undefined") {
    if (typeof console !== "undefined" && console.warn) {
      console.warn(
        "[Hockey ID] EXPO_PUBLIC_API_URL not set for production build. Using fallback. Set EXPO_PUBLIC_API_URL in EAS build env or .env for explicit control."
      );
    }
  }
  return url;
}

export const API_BASE_URL: string = resolveApiBaseUrl();

if (typeof __DEV__ !== "undefined" && __DEV__) {
  const base = API_BASE_URL.replace(/\/$/, "");
  console.log("[API CONFIG] resolved base url:", base);
}

/**
 * Global API timeout in ms.
 * Can be overridden per‑request, но это дефолт.
 */
export const apiTimeoutMs: number = Number(
  ENV.EXPO_PUBLIC_API_TIMEOUT_MS ?? 5000
) || 5000;
