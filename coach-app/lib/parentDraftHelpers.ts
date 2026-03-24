/**
 * Parent Draft Center — ready-to-share messages for parents.
 * Live: uses API GET /api/coach/parent-drafts.
 */

import { getCoachParentDrafts } from "@/services/coachParentDraftsService";

export interface ParentDraftItem {
  playerId: string;
  playerName: string;
  message: string;
  preview: string;
}

/**
 * Get all ready parent drafts from API.
 * Throws on error so caller can show error + retry.
 */
export async function getParentDrafts(): Promise<ParentDraftItem[]> {
  return getCoachParentDrafts();
}
