/**
 * Детерминированный матчинг игрока по ростеру команды (без LLM).
 * PHASE 21: observationContext — tie-break при ambiguous / узкий матч по фокусу.
 * PHASE 32: focus block игроки сильнее snapshot focus при tie-break.
 */

import type { LiveTrainingObservationContext } from "./live-training-observation-context";
import { rosterPlayersMatchingSpokenToken } from "./roster-spoken-name";

export type LiveTrainingRosterPlayer = {
  id: string;
  firstName: string;
  lastName: string;
};

export type LiveTrainingPlayerMatchResult =
  | { kind: "skipped" }
  | { kind: "resolved"; playerId: string; displayName: string }
  | { kind: "unresolved" }
  | { kind: "ambiguous" };

export type LiveTrainingPlayerMatchSource = "snapshot" | "focus_block" | "start_priority" | null;

export type LiveTrainingPlayerMatchPackage = {
  match: LiveTrainingPlayerMatchResult;
  /** Разрешение ambiguous/unresolved за счёт ровно одного игрока из focus (snapshot или focus block). */
  contextAdjustedPlayerMatch: boolean;
  /** Источник tie-break; null если матч без контекста или явный playerId. */
  contextAdjustedPlayerMatchSource: LiveTrainingPlayerMatchSource;
};

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function normLower(s: string): string {
  return collapse(s).toLowerCase();
}

function fullName(p: LiveTrainingRosterPlayer): string {
  return collapse(`${p.firstName} ${p.lastName}`);
}

function tieBreakByBlockThenStartPriorityThenSnapshot(
  candidates: LiveTrainingRosterPlayer[],
  ctx: LiveTrainingObservationContext | null | undefined
): { pick: LiveTrainingRosterPlayer | null; source: LiveTrainingPlayerMatchSource } {
  if (!ctx || candidates.length < 2) return { pick: null, source: null };
  const blockIds = ctx.focusBlockPlayerIds ?? [];
  if (blockIds.length > 0) {
    const setB = new Set(blockIds);
    const inBlock = candidates.filter((c) => setB.has(c.id));
    if (inBlock.length === 1) return { pick: inBlock[0]!, source: "focus_block" };
  }
  const prioIds = ctx.startPriorityPlayerIds ?? [];
  if (prioIds.length > 0) {
    const setP = new Set(prioIds);
    const inPrio = candidates.filter((c) => setP.has(c.id));
    if (inPrio.length === 1) return { pick: inPrio[0]!, source: "start_priority" };
  }
  const focusIds = ctx.focusPlayerIds ?? [];
  if (focusIds.length === 0) return { pick: null, source: null };
  const setF = new Set(focusIds);
  const inFocus = candidates.filter((c) => setF.has(c.id));
  if (inFocus.length === 1) return { pick: inFocus[0]!, source: "snapshot" };
  return { pick: null, source: null };
}

const emptyPackage = (match: LiveTrainingPlayerMatchResult): LiveTrainingPlayerMatchPackage => ({
  match,
  contextAdjustedPlayerMatch: false,
  contextAdjustedPlayerMatchSource: null,
});

/**
 * Если передан playerId — проверяем принадлежность ростеру.
 * Иначе при непустом playerNameRaw: exact firstName → full name → case-insensitive full name.
 * observationContext: только tie-break / узкий матч по фокусу (не заменяет явный playerId).
 */
export function matchPlayerForLiveTrainingEvent(
  roster: LiveTrainingRosterPlayer[],
  input: { playerId?: string | null; playerNameRaw?: string | null },
  observationContext?: LiveTrainingObservationContext | null
): LiveTrainingPlayerMatchPackage {
  const ctx = observationContext ?? null;

  const pid = typeof input.playerId === "string" ? input.playerId.trim() : "";
  const rawName =
    typeof input.playerNameRaw === "string" ? collapse(input.playerNameRaw) : "";

  if (pid) {
    const p = roster.find((r) => r.id === pid);
    if (p) {
      return emptyPackage({ kind: "resolved", playerId: p.id, displayName: fullName(p) });
    }
    return emptyPackage({ kind: "unresolved" });
  }

  if (!rawName) {
    return emptyPackage({ kind: "skipped" });
  }

  const tokens = rawName.split(" ").filter(Boolean);
  const firstTok = tokens[0] ?? "";

  const spoken = rosterPlayersMatchingSpokenToken(roster, firstTok);
  if (spoken.length === 1) {
    const p = spoken[0]!;
    return emptyPackage({ kind: "resolved", playerId: p.id, displayName: fullName(p) });
  }
  if (spoken.length > 1) {
    const { pick, source } = tieBreakByBlockThenStartPriorityThenSnapshot(spoken, ctx);
    if (pick) {
      return {
        match: { kind: "resolved", playerId: pick.id, displayName: fullName(pick) },
        contextAdjustedPlayerMatch: true,
        contextAdjustedPlayerMatchSource: source,
      };
    }
    return emptyPackage({ kind: "ambiguous" });
  }

  const byFullExact = roster.filter((p) => fullName(p) === rawName);
  if (byFullExact.length === 1) {
    const p = byFullExact[0];
    return emptyPackage({ kind: "resolved", playerId: p.id, displayName: fullName(p) });
  }
  if (byFullExact.length > 1) {
    const { pick, source } = tieBreakByBlockThenStartPriorityThenSnapshot(byFullExact, ctx);
    if (pick) {
      return {
        match: { kind: "resolved", playerId: pick.id, displayName: fullName(pick) },
        contextAdjustedPlayerMatch: true,
        contextAdjustedPlayerMatchSource: source,
      };
    }
    return emptyPackage({ kind: "ambiguous" });
  }

  const q = normLower(rawName);
  const byFullCi = roster.filter((p) => normLower(fullName(p)) === q);
  if (byFullCi.length === 1) {
    const p = byFullCi[0];
    return emptyPackage({ kind: "resolved", playerId: p.id, displayName: fullName(p) });
  }
  if (byFullCi.length > 1) {
    const { pick, source } = tieBreakByBlockThenStartPriorityThenSnapshot(byFullCi, ctx);
    if (pick) {
      return {
        match: { kind: "resolved", playerId: pick.id, displayName: fullName(pick) },
        contextAdjustedPlayerMatch: true,
        contextAdjustedPlayerMatchSource: source,
      };
    }
    return emptyPackage({ kind: "ambiguous" });
  }

  if (firstTok) {
    const blockIds = ctx?.focusBlockPlayerIds ?? [];
    if (blockIds.length > 0) {
      const blockRoster = roster.filter((p) => blockIds.includes(p.id));
      const spokenBlock = rosterPlayersMatchingSpokenToken(blockRoster, firstTok);
      if (spokenBlock.length === 1) {
        const p = spokenBlock[0]!;
        return {
          match: { kind: "resolved", playerId: p.id, displayName: fullName(p) },
          contextAdjustedPlayerMatch: true,
          contextAdjustedPlayerMatchSource: "focus_block",
        };
      }
    }
    const spIds = ctx?.startPriorityPlayerIds ?? [];
    if (spIds.length > 0) {
      const spRoster = roster.filter((p) => spIds.includes(p.id));
      const spokenSp = rosterPlayersMatchingSpokenToken(spRoster, firstTok);
      if (spokenSp.length === 1) {
        const p = spokenSp[0]!;
        return {
          match: { kind: "resolved", playerId: p.id, displayName: fullName(p) },
          contextAdjustedPlayerMatch: true,
          contextAdjustedPlayerMatchSource: "start_priority",
        };
      }
    }
    const focusIds = ctx?.focusPlayerIds ?? [];
    if (focusIds.length > 0) {
      const focusRoster = roster.filter((p) => focusIds.includes(p.id));
      const spokenFocus = rosterPlayersMatchingSpokenToken(focusRoster, firstTok);
      if (spokenFocus.length === 1) {
        const p = spokenFocus[0]!;
        return {
          match: { kind: "resolved", playerId: p.id, displayName: fullName(p) },
          contextAdjustedPlayerMatch: true,
          contextAdjustedPlayerMatchSource: "snapshot",
        };
      }
    }
  }

  return emptyPackage({ kind: "unresolved" });
}
