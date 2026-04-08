import type { Href } from "expo-router";
import { COACH_MARK_ID } from "@/services/chatService";

export type CoachMarkRouteParams = {
  playerId?: string | null;
  playerName?: string | null;
  teamId?: string | null;
  initialMessage?: string | null;
  /**
   * TODO (AI Arena): при коллизии имён в roster добавить игровой номер в контекст —
   * query `jerseyHint` или префикс в `initialMessage` вида «#17 Иван …».
   * @see lib/playerJerseyNumber.ts
   */
};

function pushIfPresent(q: URLSearchParams, key: string, value?: string | null) {
  const v = value?.trim();
  if (v) q.set(key, v);
}

/** Единый deep link в чат Coach Mark с контекстом игрока. */
export function hrefCoachMarkChat(params?: CoachMarkRouteParams): Href {
  const q = new URLSearchParams();
  pushIfPresent(q, "playerId", params?.playerId);
  pushIfPresent(q, "playerName", params?.playerName);
  pushIfPresent(q, "teamId", params?.teamId);
  pushIfPresent(q, "initialMessage", params?.initialMessage);
  const s = q.toString();
  return `/chat/${COACH_MARK_ID}${s ? `?${s}` : ""}` as Href;
}

/** Единый deep link в Hub Coach Mark с контекстом игрока. */
export function hrefCoachMarkHub(params?: {
  playerId?: string | null;
  playerName?: string | null;
}): Href {
  const q = new URLSearchParams();
  pushIfPresent(q, "playerId", params?.playerId);
  pushIfPresent(q, "playerName", params?.playerName);
  const s = q.toString();
  return `/coach-mark${s ? `?${s}` : ""}` as Href;
}
