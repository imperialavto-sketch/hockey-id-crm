/**
 * Build **`GET /api/coach/reports/weekly`** list rows from **`LiveTrainingSessionReportDraft`** rows
 * (confirmed sessions). Uses the same parent-facing extraction as share-report / parent-drafts **`session_draft`**.
 */

import {
  collectPlayerIdsForParentDraftScan,
  extractParentFacingFromSummary,
  parseLiveTrainingReportDraftSummary,
} from "@/lib/coach/live-training-report-draft-parent-extract";

/** Matches weekly route JSON shape (before optional `Player` name backfill). */
export type WeeklyReportItemFromDrafts = {
  playerId: string;
  playerName: string;
  shortSummary: string;
  keyPoints: string[];
  updatedAt: string;
  ready: boolean;
};

export type LiveTrainingDraftRowForWeekly = {
  summaryJson: unknown;
  updatedAt: Date;
  session: {
    confirmedAt: Date | null;
    endedAt: Date | null;
  };
};

function firstLine(text: string): string {
  const line = text.split(/\n/)[0]?.trim();
  return line || text.trim();
}

/**
 * One row per `playerId`, first win in **`drafts`** order (newest draft rows must be first).
 * **Ready** = non-empty extracted parent-facing **`message`** after trim.
 * **updatedAt** = `session.confirmedAt` → `session.endedAt` → draft `updatedAt` (ISO).
 */
export function buildWeeklyReportItemsFromLiveTrainingDraftRows(
  drafts: LiveTrainingDraftRowForWeekly[],
  playerIdSet: Set<string> | null
): WeeklyReportItemFromDrafts[] {
  const seen = new Set<string>();
  const items: WeeklyReportItemFromDrafts[] = [];

  for (const row of drafts) {
    const summary = parseLiveTrainingReportDraftSummary(row.summaryJson);
    if (!summary) continue;

    const updatedAt =
      row.session.confirmedAt?.toISOString() ??
      row.session.endedAt?.toISOString() ??
      row.updatedAt.toISOString();

    for (const playerId of collectPlayerIdsForParentDraftScan(summary)) {
      if (seen.has(playerId)) continue;
      if (playerIdSet !== null && !playerIdSet.has(playerId)) continue;

      const hit = extractParentFacingFromSummary(summary, playerId);
      const msg = hit?.message.trim();
      if (!hit || !msg) continue;

      seen.add(playerId);

      const shortSummary =
        hit.shortSummary?.trim() ||
        firstLine(msg) ||
        msg.slice(0, 200) ||
        "—";

      const keyPoints = (hit.keyPoints ?? [])
        .map((s) => (typeof s === "string" ? s.trim() : String(s ?? "")))
        .filter(Boolean)
        .slice(0, 3);

      items.push({
        playerId,
        playerName: hit.playerName.trim() || "Игрок",
        shortSummary,
        keyPoints,
        updatedAt,
        ready: true,
      });
    }
  }

  return items;
}
