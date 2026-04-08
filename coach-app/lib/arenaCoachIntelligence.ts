/**
 * Локальный слой «мышления» Арены во время live: эвристики по уже загруженным событиям.
 * Без API, без ML — только паттерны по ленте и planningSnapshot.
 */

import type { LiveTrainingEventItem } from "@/services/liveTrainingService";
import type { LiveTrainingObservationDraft, LiveTrainingSession } from "@/types/liveTraining";
import {
  evaluateGroupCoachInsights,
  type ArenaGroupCoachInsight,
} from "./arenaGroupIntelligence";

export type CoachInsightKind =
  | "PATTERN"
  | "FOCUS"
  | "ALERT"
  | "GROUP_FOCUS"
  | "GROUP_ALERT"
  | "GROUP_BALANCE";

export type CoachInsight = {
  kind: CoachInsightKind;
  tts: string;
  priority: number;
};

function mapGroupToCoachInsight(g: ArenaGroupCoachInsight): CoachInsight {
  return {
    kind: g.kind,
    priority: g.priority,
    tts: g.tts,
  };
}

/** Контекст для групповых эвристик на live (состав сегмента уже в `roster`). */
export type LiveCoachInsightContext = {
  groupRosterPlayerIds: string[];
  groupLabel: string;
};

function shortFirst(name: string | null | undefined): string {
  const t = (name ?? "").trim().split(/\s+/)[0];
  return t || "игрок";
}

function normSentiment(s: string | null | undefined): "positive" | "negative" | "neutral" | null {
  const t = (s ?? "").trim().toLowerCase();
  if (t === "positive" || t === "negative" || t === "neutral") return t;
  return null;
}

function sortByTimeAsc(events: LiveTrainingEventItem[]): LiveTrainingEventItem[] {
  return [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

/** Наблюдения с игроком из голоса/ручного ввода */
export function filterPlayerCoachEvents(events: LiveTrainingEventItem[]): LiveTrainingEventItem[] {
  return sortByTimeAsc(events).filter((e) => {
    if (!e.playerId?.trim()) return false;
    const st = (e.sourceType ?? "").toLowerCase();
    return st === "transcript_segment" || st === "manual_stub";
  });
}

/**
 * Паттерн: подряд несколько негативов по одному игроку.
 */
export function detectPlayerPatterns(events: LiveTrainingEventItem[]): CoachInsight | null {
  const pe = filterPlayerCoachEvents(events);
  if (pe.length < 3) return null;
  const last3 = pe.slice(-3);
  const pid = last3[0].playerId;
  if (!pid || last3[1].playerId !== pid || last3[2].playerId !== pid) return null;
  const s0 = normSentiment(last3[0].sentiment);
  const s1 = normSentiment(last3[1].sentiment);
  const s2 = normSentiment(last3[2].sentiment);
  if (s0 !== "negative" || s1 !== "negative" || s2 !== "negative") return null;
  const label = shortFirst(last3[2].playerNameRaw ?? last3[2].normalizedText ?? "игрок");
  return {
    kind: "PATTERN",
    priority: 82,
    tts: `У ${label} три минуса подряд — похоже на повтор, держи в голове.`,
  };
}

/**
 * Сдвиг фокуса: игрок из planningSnapshot vs кто реально собирает больше всего меток.
 */
export function detectFocusShift(
  session: LiveTrainingSession | null,
  events: LiveTrainingEventItem[]
): CoachInsight | null {
  if (!session?.planningSnapshot) return null;
  const snap = session.planningSnapshot;
  const plannedId =
    snap.startPriorities?.primaryPlayers?.[0]?.playerId?.trim() ||
    snap.focusPlayers?.[0]?.playerId?.trim() ||
    null;
  const plannedName =
    snap.startPriorities?.primaryPlayers?.[0]?.playerName?.trim() ||
    snap.focusPlayers?.[0]?.playerName?.trim() ||
    null;
  if (!plannedId && !plannedName) return null;

  const pe = filterPlayerCoachEvents(events);
  if (pe.length < 5) return null;
  const tail = pe.slice(-10);
  const counts = new Map<string, { n: number; label: string }>();
  for (const e of tail) {
    const id = e.playerId!.trim();
    const label = shortFirst(e.playerNameRaw ?? e.normalizedText ?? id);
    const cur = counts.get(id) ?? { n: 0, label };
    cur.n += 1;
    cur.label = label;
    counts.set(id, cur);
  }
  let topId: string | null = null;
  let topN = 0;
  for (const [id, v] of counts) {
    if (v.n > topN) {
      topN = v.n;
      topId = id;
    }
  }
  if (!topId || topN < 4) return null;
  if (plannedId && topId === plannedId) return null;

  const topLabel = counts.get(topId)!.label;
  const planTok = plannedName?.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (!plannedId && planTok) {
    const topMatchesPlan = tail
      .filter((e) => e.playerId === topId)
      .some((e) => (e.playerNameRaw ?? "").toLowerCase().includes(planTok));
    if (topMatchesPlan) return null;
  }

  const planLabel = shortFirst(plannedName ?? "план");
  return {
    kind: "FOCUS",
    priority: 74,
    tts: `В старте упоминали ${planLabel}, а сейчас больше меток по ${topLabel} — осознанный сдвиг?`,
  };
}

/**
 * Выбивается: последняя запись на проверку или резкий сдвиг тона у игрока.
 */
export function detectAlertSignals(events: LiveTrainingEventItem[]): CoachInsight | null {
  const pe = filterPlayerCoachEvents(events);
  if (pe.length === 0) return null;
  const last = pe[pe.length - 1];
  if (last.needsReview) {
    const label = shortFirst(last.playerNameRaw);
    return {
      kind: "ALERT",
      priority: 90,
      tts: `Последняя по ${label} с пометкой проверки — не потеряй при разборе.`,
    };
  }
  if (pe.length >= 2) {
    const a = pe[pe.length - 2];
    const b = pe[pe.length - 1];
    if (a.playerId === b.playerId) {
      const sa = normSentiment(a.sentiment);
      const sb = normSentiment(b.sentiment);
      if (sa === "positive" && sb === "negative") {
        const label = shortFirst(b.playerNameRaw);
        return {
          kind: "ALERT",
          priority: 84,
          tts: `У ${label} только что плюс, теперь минус — гляни картину целиком.`,
        };
      }
    }
  }
  return null;
}

/**
 * Много записей по одному игроку в коротком окне — явный фокус внимания.
 */
export function detectAttentionFocus(events: LiveTrainingEventItem[]): CoachInsight | null {
  const pe = filterPlayerCoachEvents(events);
  if (pe.length < 5) return null;
  const tail = pe.slice(-10);
  const counts = new Map<string, { n: number; label: string }>();
  for (const e of tail) {
    const id = e.playerId!.trim();
    const label = shortFirst(e.playerNameRaw ?? e.normalizedText ?? id);
    const cur = counts.get(id) ?? { n: 0, label };
    cur.n += 1;
    counts.set(id, cur);
  }
  let topId: string | null = null;
  let topN = 0;
  for (const [id, v] of counts) {
    if (v.n > topN) {
      topN = v.n;
      topId = id;
    }
  }
  if (!topId || topN < 4) return null;
  const label = counts.get(topId)!.label;
  return {
    kind: "FOCUS",
    priority: 72,
    tts: `Много фиксаций по ${label} — похоже, он сейчас твой главный фокус.`,
  };
}

/**
 * Одна лучшая подсказка для TTS.
 * Групповые кандидаты имеют priority ≤ 58; player-level ≥ 72 — при совпадении выигрывает игрок.
 */
export function evaluateLiveCoachInsights(
  events: LiveTrainingEventItem[],
  session: LiveTrainingSession | null,
  groupContext?: LiveCoachInsightContext | null
): CoachInsight | null {
  const candidates: CoachInsight[] = [];
  const a = detectAlertSignals(events);
  if (a) candidates.push(a);
  const p = detectPlayerPatterns(events);
  if (p) candidates.push(p);
  const f = detectFocusShift(session, events);
  if (f) candidates.push(f);
  const att = detectAttentionFocus(events);
  if (att) candidates.push(att);

  if (groupContext?.groupLabel && groupContext.groupRosterPlayerIds.length > 0) {
    const gi = evaluateGroupCoachInsights(
      events,
      new Set(groupContext.groupRosterPlayerIds),
      groupContext.groupLabel
    );
    if (gi) candidates.push(mapGroupToCoachInsight(gi));
  }

  if (candidates.length === 0) return null;
  candidates.sort((x, y) => y.priority - x.priority);
  return candidates[0] ?? null;
}

export function buildInsightTts(insight: CoachInsight): string {
  return insight.tts.trim();
}

// --- Review (черновики сессии) ---

export function buildArenaReviewIntelligenceBullets(
  drafts: LiveTrainingObservationDraft[]
): string[] {
  if (drafts.length < 2) return [];
  const withPlayer = drafts.filter((d) => d.playerId?.trim());
  if (withPlayer.length === 0) return [];

  const byPlayer = new Map<string, { name: string; neg: number; pos: number; n: number }>();
  for (const d of withPlayer) {
    const id = d.playerId!.trim();
    const name = (d.playerNameRaw ?? "").trim() || "Игрок";
    const cur = byPlayer.get(id) ?? { name: shortFirst(name), neg: 0, pos: 0, n: 0 };
    cur.n += 1;
    if (d.sentiment === "negative") cur.neg += 1;
    if (d.sentiment === "positive") cur.pos += 1;
    byPlayer.set(id, cur);
  }

  let topId: string | null = null;
  let topN = 0;
  for (const [id, v] of byPlayer) {
    if (v.n > topN) {
      topN = v.n;
      topId = id;
    }
  }
  const lines: string[] = [];
  if (topId && topN >= 2) {
    const v = byPlayer.get(topId)!;
    lines.push(`Больше всего материала по ${v.name} — вероятный узел смены.`);
  }

  let maxNegRatio = 0;
  let negName = "";
  for (const [, v] of byPlayer) {
    if (v.neg >= 2 && v.n >= 2) {
      const r = v.neg / v.n;
      if (r >= maxNegRatio) {
        maxNegRatio = r;
        negName = v.name;
      }
    }
  }
  if (negName && maxNegRatio >= 0.5 && lines.length < 2) {
    lines.push(`По ${negName} плотнее минусы — при разборе смотри контекст, не только тон.`);
  }
  if (lines.length === 0 && drafts.length >= 4) {
    lines.push("Несколько линий наблюдений — выдели 1–2, которые зададут тон карточкам.");
  }
  return lines.slice(0, 2);
}
