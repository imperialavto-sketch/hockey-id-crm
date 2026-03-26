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
  id?: string;
  source?: "parent_draft" | "session_draft";
  playerId: string | null;
  playerName: string;
  text?: string;
  shortSummary?: string;
  messagePreview?: string;
  updatedAt?: string;
  ready?: boolean;
  /** Только для standalone ParentDraft; у session_draft не приходит. */
  voiceNoteId?: string | null;
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
  {
    id: string;
    playerId: string | null;
    playerName: string;
    message: string;
    preview: string;
    updatedAt?: string | null;
    source?: "parent_draft" | "session_draft" | null;
    voiceNoteId?: string | null;
  }[]
> {
  if (isEndpointUnavailable(PARENT_DRAFTS_PATH)) return [];
  try {
    const headers = await getCoachAuthHeaders();
    const raw = await apiFetch<ParentDraftApiItem[]>(PARENT_DRAFTS_PATH, {
      method: "GET",
      headers,
    });
    const items = Array.isArray(raw) ? raw : [];
    const ready = items.filter((r) => r && r.ready !== false);
    return ready.map((api, idx) => {
      const text = api.text ?? api.messagePreview ?? api.shortSummary ?? "—";
      const id =
        (typeof api.id === "string" && api.id.trim()) ||
        `${api.source ?? "legacy"}_${api.playerId ?? "none"}_${idx}`;
      const voiceNoteIdStandalone =
        api.source === "session_draft"
          ? undefined
          : typeof api.voiceNoteId === "string"
            ? api.voiceNoteId.trim() || null
            : api.voiceNoteId === null
              ? null
              : undefined;
      return {
        id,
        playerId: api.playerId ?? null,
        playerName: api.playerName ?? "Игрок",
        message: text,
        preview: truncate(text, 80),
        updatedAt: api.updatedAt ?? null,
        source: api.source ?? null,
        ...(voiceNoteIdStandalone !== undefined ? { voiceNoteId: voiceNoteIdStandalone } : {}),
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

/** Outcome of GET share-report (same payload; richer client typing only). */
export type CoachShareReportResult =
  | {
      kind: "ready";
      playerName: string;
      message: string;
      shortSummary?: string;
      keyPoints?: string[];
      recommendations?: string[];
      updatedAt?: string;
    }
  | { kind: "not_ready" }
  | { kind: "failed" };

function nonEmptyStrings(arr: unknown): string[] | undefined {
  if (!Array.isArray(arr)) return undefined;
  const out = arr.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  return out.length > 0 ? out : undefined;
}

/**
 * Fetch share report for a player.
 * `not_ready`: нет текста, 404, endpoint выключен, ready=false.
 * `failed`: сетевая/серверная ошибка (не 404).
 */
export async function getCoachShareReport(playerId: string): Promise<CoachShareReportResult> {
  const path = `${shareReportPrefix}${encodeURIComponent(playerId)}/share-report`;
  if (isEndpointUnavailable(path)) return { kind: "not_ready" };
  try {
    const headers = await getCoachAuthHeaders();
    const res = await apiFetch<ShareReportApiItem | null>(path, {
      method: "GET",
      headers,
    });
    const msg = typeof res?.message === "string" ? res.message.trim() : "";
    if (!res || res.ready === false || !msg) return { kind: "not_ready" };
    const shortSummary =
      typeof res.shortSummary === "string" && res.shortSummary.trim() ? res.shortSummary.trim() : undefined;
    const updatedAt =
      typeof res.updatedAt === "string" && res.updatedAt.trim() ? res.updatedAt.trim() : undefined;
    return {
      kind: "ready",
      playerName: res.playerName?.trim() || "Игрок",
      message: msg,
      shortSummary,
      keyPoints: nonEmptyStrings(res.keyPoints),
      recommendations: nonEmptyStrings(res.recommendations),
      updatedAt,
    };
  } catch (e) {
    if (isApi404(e)) {
      markEndpointUnavailable(path);
      return { kind: "not_ready" };
    }
    return { kind: "failed" };
  }
}
