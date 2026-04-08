/**
 * **`GET /api/coach/reports/player/[id]`** — map canonical draft extraction + timestamps + signal count
 * to the player-report JSON shape. **`avgScore`** is intentionally omitted (no canonical 1:1; Phase **3L**).
 */

import type { ParentFacingExtract } from "@/lib/coach/live-training-report-draft-parent-extract";

export type LiveTrainingDraftTimestampsForPlayerReport = {
  updatedAt: Date;
  session: { confirmedAt: Date | null; endedAt: Date | null };
};

function firstLine(text: string): string {
  const line = text.split(/\n/)[0]?.trim();
  return line || text.trim();
}

/**
 * **`updatedAt`:** `session.confirmedAt` → `session.endedAt` → draft **`updatedAt`** (ISO).
 * **`shortSummary` / `keyPoints` / `recommendations`:** from **`ParentFacingExtract`** (same chain as share / weekly).
 */
export function buildPlayerReportApiPayloadFromLiveTrainingExtract(
  playerId: string,
  hit: ParentFacingExtract,
  timestamps: LiveTrainingDraftTimestampsForPlayerReport,
  observationsCount: number
): {
  playerId: string;
  playerName: string;
  observationsCount: number;
  shortSummary?: string;
  keyPoints?: string[];
  recommendations?: string[];
  updatedAt: string;
  ready: true;
} {
  const msg = hit.message.trim();
  const shortSummary =
    hit.shortSummary?.trim() || firstLine(msg) || (msg ? msg.slice(0, 200) : undefined);

  const keyPoints = (hit.keyPoints ?? [])
    .map((s) => (typeof s === "string" ? s.trim() : String(s ?? "")))
    .filter(Boolean);

  const recommendations = (hit.recommendations ?? [])
    .map((s) => (typeof s === "string" ? s.trim() : String(s ?? "")))
    .filter(Boolean);

  const updatedAt =
    timestamps.session.confirmedAt?.toISOString() ??
    timestamps.session.endedAt?.toISOString() ??
    timestamps.updatedAt.toISOString();

  return {
    playerId,
    playerName: hit.playerName.trim() || "Игрок",
    observationsCount,
    shortSummary,
    keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
    recommendations: recommendations.length > 0 ? recommendations : undefined,
    updatedAt,
    ready: true,
  };
}
