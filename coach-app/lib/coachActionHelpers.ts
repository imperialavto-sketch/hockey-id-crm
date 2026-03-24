/**
 * Coach Action Center — players requiring attention.
 * Live: uses API GET /api/coach/actions.
 */

import { getCoachActions } from "@/services/coachActionsService";

export type ActionStatus = "Требует внимания" | "Есть спад" | "Нужен разбор";

export interface CoachActionItem {
  playerId: string;
  playerName: string;
  status: ActionStatus;
  actionLine: string;
  priority: 1 | 2 | 3; // 1=high, 2=medium, 3=low
}

/**
 * Get players requiring coach attention from API.
 * Throws on error so caller can show error + retry.
 */
export async function getCoachActionItems(): Promise<CoachActionItem[]> {
  return getCoachActions();
}
