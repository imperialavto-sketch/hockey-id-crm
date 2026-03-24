/**
 * Coach Actions API — players requiring attention.
 * Auth: getCoachAuthHeaders (Bearer; dev without token gets 401).
 * GET /api/coach/actions
 */

import { apiFetch, isApi404 } from "@/lib/api";
import { getCoachAuthHeaders } from "@/lib/coachAuth";
import { isEndpointUnavailable, markEndpointUnavailable } from "@/lib/endpointAvailability";
import type { ActionStatus, CoachActionItem } from "@/lib/coachActionHelpers";

/** API response for action item */
export interface CoachActionApiItem {
  playerId: string;
  playerName: string;
  reason?: string;
  severity?: string;
  observationsCount?: number;
  topSkillKeys?: string[];
  updatedAt?: string;
}

function mapSeverityToStatusAndPriority(
  severity: string | undefined
): { status: ActionStatus; priority: 1 | 2 | 3 } {
  const s = (severity ?? "").toLowerCase();
  if (s === "high" || s === "critical") {
    return { status: "Требует внимания", priority: 1 };
  }
  if (s === "medium") {
    return { status: "Есть спад", priority: 2 };
  }
  return { status: "Нужен разбор", priority: 3 };
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3).trim() + "...";
}

/**
 * Map API item to CoachActionItem UI model.
 */
function mapActionApiToUi(api: CoachActionApiItem): CoachActionItem {
  const { status, priority } = mapSeverityToStatusAndPriority(api.severity);
  const actionLine = truncate(
    api.reason ?? "Стоит обсудить прогресс",
    60
  );
  return {
    playerId: api.playerId,
    playerName: api.playerName ?? "Игрок",
    status,
    actionLine,
    priority,
  };
}

const ACTIONS_PATH = "/api/coach/actions";

/**
 * Fetch coach actions from API.
 * Returns [] on 404 (endpoint absent). Throws on other errors.
 */
export async function getCoachActions(): Promise<CoachActionItem[]> {
  if (isEndpointUnavailable(ACTIONS_PATH)) return [];
  try {
    const headers = await getCoachAuthHeaders();
    const raw = await apiFetch<CoachActionApiItem[]>(ACTIONS_PATH, {
      method: "GET",
      headers,
    });
    const items = Array.isArray(raw) ? raw : [];
    const valid = items.filter((item): item is CoachActionApiItem => !!item?.playerId);
    const mapped = valid.map(mapActionApiToUi);
    mapped.sort((a, b) => a.priority - b.priority);
    return mapped;
  } catch (e) {
    if (isApi404(e)) {
      markEndpointUnavailable(ACTIONS_PATH);
      return [];
    }
    throw e;
  }
}
