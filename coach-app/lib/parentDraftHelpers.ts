/**
 * Parent Draft Center — ready-to-share messages for parents.
 * Live: uses API GET /api/coach/parent-drafts.
 */

import { getCoachParentDrafts } from "@/services/coachParentDraftsService";

export interface ParentDraftItem {
  id: string;
  playerId: string | null;
  playerName: string;
  message: string;
  preview: string;
  /** ISO 8601 from API when present */
  updatedAt?: string | null;
  /** Origin of the draft when API sends it */
  source?: "parent_draft" | "session_draft" | null;
  /** Только для standalone; у session_draft нет. */
  voiceNoteId?: string | null;
}

/**
 * Get all ready parent drafts from API.
 * Throws on error so caller can show error + retry.
 */
export async function getParentDrafts(): Promise<ParentDraftItem[]> {
  return getCoachParentDrafts();
}
