/**
 * Session Sync State — per-session sync status for coach Session Capture.
 * Keyed by sessionId.
 */

export type SessionSyncState = "pending" | "syncing" | "synced" | "failed";

export interface SessionSyncMeta {
  state: SessionSyncState;
  lastAttemptAt?: number;
  lastSyncedAt?: number;
  errorMessage?: string;
}

export type SessionSyncStateMap = Record<string, SessionSyncMeta>;
