/**
 * API config. Base URL for the Hockey ID backend.
 * Use local network IP (not localhost) so the phone/simulator can reach the server.
 */

export const API_BASE_URL = "http://192.168.1.45:3000";

/** true when running in development (__DEV__) */
export const isDev = typeof __DEV__ !== "undefined" && __DEV__;
