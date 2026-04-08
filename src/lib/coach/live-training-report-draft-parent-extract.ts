/**
 * Pure helpers: derive parent-facing preview text from **`LiveTrainingSessionReportDraft.summaryJson`**
 * (`LiveTrainingSessionReportDraftSummary`). Used by coach **`/api/coach/players/.../share-report`** and
 * **`/api/coach/parent-drafts`** (`session_draft` branch).
 */

import type { LiveTrainingSessionReportDraftSummary } from "@/lib/live-training/live-training-session-report-draft";

export function parseLiveTrainingReportDraftSummary(
  raw: unknown
): LiveTrainingSessionReportDraftSummary | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as LiveTrainingSessionReportDraftSummary;
}

function deriveKeyPoints(
  summary: LiveTrainingSessionReportDraftSummary,
  playerId: string
): string[] | undefined {
  const pos = (summary.notes?.positives ?? [])
    .filter((n) => n.playerId === playerId && typeof n.text === "string" && n.text.trim())
    .map((n) => n.text.trim());
  if (pos.length > 0) return pos.slice(0, 5);
  const ev = summary.players
    ?.find((p) => p.playerId === playerId)
    ?.evidence?.filter((e) => e.direction === "positive" && e.text?.trim())
    .map((e) => e.text.trim());
  return ev && ev.length > 0 ? ev.slice(0, 5) : undefined;
}

function deriveRecommendations(
  summary: LiveTrainingSessionReportDraftSummary,
  playerId: string
): string[] | undefined {
  const need = (summary.notes?.needsAttention ?? [])
    .filter((n) => n.playerId === playerId && typeof n.text === "string" && n.text.trim())
    .map((n) => n.text.trim());
  return need.length > 0 ? need.slice(0, 5) : undefined;
}

export type ParentFacingExtract = {
  message: string;
  shortSummary?: string;
  keyPoints?: string[];
  recommendations?: string[];
  playerName: string;
};

/**
 * Fixed chain: sessionMeaningParentActionsV1 → coachPreview playerHighlights → notes.positives → positive evidence.
 */
export function extractParentFacingFromSummary(
  summary: LiveTrainingSessionReportDraftSummary,
  playerId: string
): ParentFacingExtract | null {
  const playerRow = summary.players?.find((p) => p.playerId === playerId);
  const defaultName = playerRow?.playerName?.trim() || "Игрок";

  const parentEntry = summary.sessionMeaningParentActionsV1?.find((a) => a.playerId === playerId);
  if (parentEntry?.actions?.length) {
    const lines = parentEntry.actions.map((a) => String(a).trim()).filter(Boolean);
    const message = lines.join("\n\n");
    if (message) {
      return {
        message,
        shortSummary: lines[0],
        keyPoints: deriveKeyPoints(summary, playerId),
        recommendations: deriveRecommendations(summary, playerId),
        playerName: parentEntry.playerName?.trim() || defaultName,
      };
    }
  }

  const highlight = summary.coachPreviewNarrativeV1?.playerHighlights?.find((h) => h.playerId === playerId);
  const hlText = highlight?.text?.trim();
  if (hlText) {
    return {
      message: hlText,
      shortSummary: hlText.split("\n")[0]?.slice(0, 200),
      keyPoints: deriveKeyPoints(summary, playerId),
      recommendations: deriveRecommendations(summary, playerId),
      playerName: highlight?.playerName?.trim() || defaultName,
    };
  }

  const posNotes = (summary.notes?.positives ?? [])
    .filter((n) => n.playerId === playerId && typeof n.text === "string" && n.text.trim())
    .map((n) => n.text.trim());
  if (posNotes.length > 0) {
    const message = posNotes.join("\n\n");
    return {
      message,
      shortSummary: posNotes[0],
      keyPoints: posNotes.slice(0, 5),
      recommendations: deriveRecommendations(summary, playerId),
      playerName: defaultName,
    };
  }

  const posEvidence = playerRow?.evidence
    ?.filter((e) => e.direction === "positive" && e.text?.trim())
    .map((e) => e.text.trim());
  if (posEvidence && posEvidence.length > 0) {
    const message = posEvidence.join("\n\n");
    return {
      message,
      shortSummary: posEvidence[0],
      keyPoints: posEvidence.slice(0, 5),
      recommendations: deriveRecommendations(summary, playerId),
      playerName: defaultName,
    };
  }

  return null;
}

/** Player ids that might have extractable parent-facing text in this summary (for parent-drafts list scan). */
export function collectPlayerIdsForParentDraftScan(
  summary: LiveTrainingSessionReportDraftSummary
): string[] {
  const ids = new Set<string>();
  for (const p of summary.players ?? []) {
    if (p.playerId) ids.add(p.playerId);
  }
  for (const a of summary.sessionMeaningParentActionsV1 ?? []) {
    if (a.playerId) ids.add(a.playerId);
  }
  for (const n of summary.notes?.positives ?? []) {
    if (n.playerId) ids.add(n.playerId);
  }
  for (const n of summary.notes?.needsAttention ?? []) {
    if (n.playerId) ids.add(n.playerId);
  }
  for (const h of summary.coachPreviewNarrativeV1?.playerHighlights ?? []) {
    if (h.playerId) ids.add(h.playerId);
  }
  return Array.from(ids).sort();
}
