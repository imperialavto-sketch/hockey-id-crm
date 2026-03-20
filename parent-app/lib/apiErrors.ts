/**
 * API error types for consistent handling across services.
 * UI can show appropriate messages based on error kind.
 */

export type ApiErrorKind =
  | "network" /** Server unreachable, no connection */
  | "api" /** HTTP 4xx/5xx, server error response */
  | "not_found" /** 404 */
  | "validation" /** 400, invalid input */
  | "timeout" /** Request timeout */
  | "unknown";

export interface TypedApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
}

export function classifyApiError(err: unknown): ApiErrorKind {
  if (!(err instanceof Error)) return "unknown";
  const msg = err.message ?? "";
  if (err.name === "AbortError") return "timeout";
  if (
    msg.includes("Network request failed") ||
    msg.includes("Failed to fetch") ||
    msg.includes("Сервер недоступен")
  )
    return "network";
  if (msg.includes("404") || msg.includes("не найден")) return "not_found";
  if (msg.includes("400")) return "validation";
  if (msg.includes("Превышено время ожидания")) return "timeout";
  return "api";
}

/** Log API error. Always logs in dev; in prod only critical. */
export function logApiError(context: string, err: unknown, url?: string): void {
  const kind = classifyApiError(err);
  const msg = err instanceof Error ? err.message : String(err);
  if (!__DEV__) {
    // In production we can later add selective logging if needed.
    return;
  }
  const prefix = `[${context}] API error (${kind}):`;
  if (kind === "api" || kind === "validation" || kind === "not_found") {
    // Recoverable API-level errors: log as warning to avoid noisy red overlays in dev.
    console.warn(prefix, msg, url ?? "");
  } else {
    // Network, timeout, unknown: keep as error for easier debugging.
    console.error(prefix, msg, url ?? "");
  }
}
