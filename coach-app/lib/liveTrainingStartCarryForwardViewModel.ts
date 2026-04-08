/**
 * Closed loop complete → next start: один компактный слой из start-planning (без LLM).
 */

import type { LiveTrainingStartPlanningSummary } from "@/services/liveTrainingService";

export type LiveTrainingClosedLoopPlayerLine = {
  playerId: string;
  displayName: string;
  note?: string;
};

export type LiveTrainingStartClosedLoopPrep = {
  /** Сводка с прошлой фиксации / lock-in / фокус планирования. */
  fromLastSession: string[];
  /** Индивидуальный акцент на старте. */
  playersInFocus: LiveTrainingClosedLoopPlayerLine[];
  /** Темы (домены), которые тянутся в работу сегодня. */
  themesForToday: string[];
  /** Пятёрка / общий итог с прошлого занятия. */
  teamGroupAccent: string[];
  /** Вторичный перенос, ручная проверка, давление по приоритетам. */
  unresolvedOrDeferred: string[];
};

function dedupeStrings(lines: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of lines) {
    const s = raw.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function shortName(full: string): string {
  const t = full.trim().split(/\s+/)[0];
  return t || full;
}

/**
 * Собирает prep из уже загруженного start-planning (carryForward, startPriorities, lastSessionHandoffHints).
 */
export function buildLiveTrainingStartClosedLoopPrep(
  planning: LiveTrainingStartPlanningSummary | null
): LiveTrainingStartClosedLoopPrep {
  if (!planning) {
    return {
      fromLastSession: [],
      playersInFocus: [],
      themesForToday: [],
      teamGroupAccent: [],
      unresolvedOrDeferred: [],
    };
  }

  const hints = Array.isArray(planning.lastSessionHandoffHints)
    ? planning.lastSessionHandoffHints.map((h) => h.trim()).filter(Boolean)
    : [];

  const teamGroupAccent = hints.filter(
    (h) => h.startsWith("Пятёрка:") || h.startsWith("Итог сессии:")
  );
  const manualHints = hints.filter((h) => h.startsWith("Не закрыто вручную"));

  const fromRaw: string[] = [];
  const sp = planning.startPriorities;
  if (sp?.summaryLine?.trim()) {
    fromRaw.push(sp.summaryLine.trim());
  }
  if (planning.carryForward?.carryForwardSummary?.length) {
    fromRaw.push(...planning.carryForward.carryForwardSummary);
  }
  for (const line of planning.summaryLines) {
    if (line.trim()) fromRaw.push(line.trim());
  }
  const fromLastSession = dedupeStrings(fromRaw, 3);

  const playersInFocus: LiveTrainingClosedLoopPlayerLine[] = [];
  const seenPid = new Set<string>();
  const primary = sp?.primaryPlayers ?? [];
  if (primary.length > 0) {
    for (const p of primary) {
      if (playersInFocus.length >= 4) break;
      if (seenPid.has(p.playerId)) continue;
      seenPid.add(p.playerId);
      playersInFocus.push({
        playerId: p.playerId,
        displayName: shortName(p.playerName),
        note: p.reason?.trim() || undefined,
      });
    }
  } else if (planning.carryForward?.focusPlayers?.length) {
    for (const p of planning.carryForward.focusPlayers) {
      if (playersInFocus.length >= 4) break;
      if (seenPid.has(p.playerId)) continue;
      seenPid.add(p.playerId);
      playersInFocus.push({
        playerId: p.playerId,
        displayName: shortName(p.playerName),
        note: p.reason?.trim() || undefined,
      });
    }
  } else {
    for (const p of planning.focusPlayers) {
      if (playersInFocus.length >= 4) break;
      if (seenPid.has(p.playerId)) continue;
      seenPid.add(p.playerId);
      const r = p.reasons[0]?.trim();
      playersInFocus.push({
        playerId: p.playerId,
        displayName: shortName(p.playerName),
        note: r || undefined,
      });
    }
  }

  const themeRaw: string[] = [];
  for (const d of sp?.primaryDomains ?? []) {
    if (d.labelRu?.trim()) themeRaw.push(d.labelRu.trim());
  }
  for (const d of planning.carryForward?.focusDomains ?? []) {
    if (d.labelRu?.trim()) themeRaw.push(d.labelRu.trim());
  }
  for (const d of planning.focusDomains) {
    if (d.labelRu?.trim()) themeRaw.push(d.labelRu.trim());
  }
  const themesForToday = dedupeStrings(themeRaw, 4);

  const unresolvedRaw: string[] = [...manualHints];
  for (const line of sp?.secondaryItems ?? []) {
    if (line.trim()) unresolvedRaw.push(line.trim());
  }
  if ((sp?.reinforcementItems?.length ?? 0) > 0) {
    const r = sp!.reinforcementItems[0]?.trim();
    if (r) unresolvedRaw.push(`Закрепление: ${r}`);
  }
  if (planning.priorAlignmentAdaptive?.executionMode === "recover") {
    unresolvedRaw.push("Прошлый старт закрыт неполно — сегодня чуть плотнее проверь переносы.");
  }
  if (planning.coachIntelligence?.executionPressureMode === "tighten") {
    unresolvedRaw.push("По недавней истории — выше планка внимания к переносам.");
  }
  const unresolvedOrDeferred = dedupeStrings(unresolvedRaw, 3);

  return {
    fromLastSession,
    playersInFocus,
    themesForToday,
    teamGroupAccent,
    unresolvedOrDeferred,
  };
}

export function liveTrainingStartClosedLoopPrepHasContent(p: LiveTrainingStartClosedLoopPrep): boolean {
  return (
    p.fromLastSession.length > 0 ||
    p.playersInFocus.length > 0 ||
    p.themesForToday.length > 0 ||
    p.teamGroupAccent.length > 0 ||
    p.unresolvedOrDeferred.length > 0
  );
}
