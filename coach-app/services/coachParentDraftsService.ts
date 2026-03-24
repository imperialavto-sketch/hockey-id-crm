/**
 * Coach Parent Drafts & Share Report API.
 * Auth: getCoachAuthHeaders (Bearer; dev without token gets 401).
 * GET /api/coach/parent-drafts
 * GET /api/coach/players/:playerId/share-report
 */

import { apiFetch, isApi404 } from "@/lib/api";
import { getCoachAuthHeaders } from "@/lib/coachAuth";
import { isEndpointUnavailable, markEndpointUnavailable } from "@/lib/endpointAvailability";

/** API response for parent draft item */
export interface ParentDraftApiItem {
  playerId: string;
  playerName: string;
  shortSummary?: string;
  messagePreview?: string;
  updatedAt?: string;
  ready?: boolean;
}

/** API response for share report */
export interface ShareReportApiItem {
  playerId: string;
  playerName: string;
  ready?: boolean;
  message?: string;
  shortSummary?: string;
  keyPoints?: string[];
  recommendations?: string[];
  updatedAt?: string;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3).trim() + "...";
}

const PARENT_DRAFTS_PATH = "/api/coach/parent-drafts";

/**
 * Fetch parent drafts from API.
 * Returns [] on 404 (endpoint absent). Throws on other errors.
 */
export async function getCoachParentDrafts(): Promise<
  { playerId: string; playerName: string; message: string; preview: string }[]
> {
  if (isEndpointUnavailable(PARENT_DRAFTS_PATH)) return [];
  try {
    const headers = await getCoachAuthHeaders();
    const raw = await apiFetch<ParentDraftApiItem[]>(PARENT_DRAFTS_PATH, {
      method: "GET",
      headers,
    });
    const items = Array.isArray(raw) ? raw : [];
    const ready = items.filter((r) => r?.playerId && r.ready !== false);
    return ready.map((api) => {
      const text = api.messagePreview ?? api.shortSummary ?? "—";
      return {
        playerId: api.playerId,
        playerName: api.playerName ?? "Игрок",
        message: text,
        preview: truncate(text, 80),
      };
    });
  } catch (e) {
    if (isApi404(e)) {
      markEndpointUnavailable(PARENT_DRAFTS_PATH);
      return [];
    }
    throw e;
  }
}

const shareReportPrefix = "/api/coach/players/";

/**
 * Fetch share report for a player.
 * Returns null on error, 404, or ready=false.
 */
export async function getCoachShareReport(
  playerId: string
): Promise<{ playerName: string; message: string } | null> {
  const path = `${shareReportPrefix}${encodeURIComponent(playerId)}/share-report`;
  if (isEndpointUnavailable(path)) return null;
  try {
    const headers = await getCoachAuthHeaders();
    const res = await apiFetch<ShareReportApiItem | null>(path, {
      method: "GET",
      headers,
    });
    if (!res || res.ready === false || !res.message) return null;
    return {
      playerName: res.playerName ?? "Игрок",
      message: res.message,
    };
  } catch (e) {
    if (isApi404(e)) markEndpointUnavailable(path);
    return null;
  }
}
