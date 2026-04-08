/**
 * Краткая память «Арены» в рамках live-сессии (без персистентности).
 */

import {
  ARENA_LAST_NO_PLAYER,
  ARENA_LAST_TARGET_SESSION,
  ARENA_LAST_TARGET_TEAM,
} from "@/lib/arenaVoicePhrases";

export type ArenaTargetType = "player" | "team" | "session";

export type ArenaConversationContext = {
  lastReferencedPlayer: { id: string; name: string } | null;
  lastObservationDraftId: string | null;
  lastTargetType: ArenaTargetType | null;
  lastParsedDomain: string | null;
  lastParsedSkill: string | null;
  lastObservationRawText: string | null;
};

export function createEmptyArenaConversationContext(): ArenaConversationContext {
  return {
    lastReferencedPlayer: null,
    lastObservationDraftId: null,
    lastTargetType: null,
    lastParsedDomain: null,
    lastParsedSkill: null,
    lastObservationRawText: null,
  };
}

export function arenaContextAfterObservation(
  prev: ArenaConversationContext,
  patch: {
    draftId: string | null;
    playerId: string | null;
    playerName: string | null;
    targetType: ArenaTargetType;
    domain: string | null;
    skill: string | null;
    rawText: string;
  }
): ArenaConversationContext {
  const nextPlayer =
    patch.playerId && patch.playerName
      ? { id: patch.playerId, name: patch.playerName }
      : prev.lastReferencedPlayer;

  return {
    ...prev,
    lastObservationDraftId: patch.draftId ?? prev.lastObservationDraftId,
    lastReferencedPlayer: nextPlayer,
    lastTargetType: patch.targetType,
    lastParsedDomain: patch.domain,
    lastParsedSkill: patch.skill,
    lastObservationRawText: patch.rawText,
  };
}

export function arenaContextAfterDelete(prev: ArenaConversationContext): ArenaConversationContext {
  return {
    ...prev,
    lastObservationDraftId: null,
    lastObservationRawText: null,
  };
}

export function arenaContextAfterReassignPlayer(
  prev: ArenaConversationContext,
  player: { id: string; name: string }
): ArenaConversationContext {
  return {
    ...prev,
    lastReferencedPlayer: player,
    lastTargetType: "player",
  };
}

/** Короткая фраза для голосового статуса последней записи */
export function buildLastObservationStatusPhrase(ctx: ArenaConversationContext): string | null {
  if (!ctx.lastObservationRawText?.trim() && !ctx.lastObservationDraftId) return null;
  const text = (ctx.lastObservationRawText ?? "").trim().slice(0, 72);
  const target =
    ctx.lastTargetType === "team"
      ? ARENA_LAST_TARGET_TEAM
      : ctx.lastTargetType === "session"
        ? ARENA_LAST_TARGET_SESSION
        : ctx.lastReferencedPlayer
          ? ctx.lastReferencedPlayer.name.split(/\s+/)[0] ?? ARENA_LAST_NO_PLAYER
          : ARENA_LAST_NO_PLAYER;
  const tag =
    ctx.lastParsedDomain && ctx.lastParsedSkill
      ? ` · ${ctx.lastParsedDomain}.${ctx.lastParsedSkill}`
      : ctx.lastParsedDomain
        ? ` · ${ctx.lastParsedDomain}`
        : "";
  if (!text) return `Последняя запись: ${target}${tag}.`;
  return `${target}: ${text}${tag}.`;
}
