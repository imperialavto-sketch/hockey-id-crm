/**
 * Parent mobile — Hockey ID professional stats snapshot (optional API).
 * Backend route may be absent until deployed; 404 → null (graceful empty state).
 */

import { apiFetch, ApiRequestError } from "@/lib/api";

export type ParentProfessionalStatsRaw = Record<string, unknown>;

export async function fetchPlayerProfessionalStats(
  playerId: string
): Promise<ParentProfessionalStatsRaw | null> {
  const path = `/api/parent/mobile/player/${encodeURIComponent(playerId)}/professional-stats`;
  try {
    const data = await apiFetch<unknown>(path, { method: "GET" });
    if (!data || typeof data !== "object") return null;
    return data as ParentProfessionalStatsRaw;
  } catch (e) {
    if (e instanceof ApiRequestError && (e.status === 404 || e.status === 501)) {
      return null;
    }
    throw e;
  }
}
