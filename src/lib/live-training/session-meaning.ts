/**
 * PHASE 6: SessionMeaning — дополнительный read-model «картины смысла» живой тренировки.
 * Не заменяет events / drafts / signals / summaryJson; собирается из них и кэшируется в `sessionMeaningJson`.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SESSION_MEANING_VERSION = 1 as const;

export type SessionMeaningContext = {
  liveTrainingSessionId: string;
  teamId: string;
  teamName: string | null;
  status: string;
  mode: string;
  trainingSessionId: string | null;
  startedAt: string;
  confirmedAt: string | null;
};

export type SessionMeaningTheme = {
  key: string;
  weight: number;
  sources: Array<"event_category" | "draft_category" | "signal_domain" | "summary_focus">;
};

export type SessionMeaningFocus = {
  label: string;
  weight: number;
};

export type SessionMeaningTeam = {
  signalTotals: { positive: number; negative: number; neutral: number };
  needsAttentionLines: string[];
  positiveLines: string[];
};

export type SessionMeaningPlayer = {
  playerId: string;
  playerName: string;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  topThemes: string[];
  sampleEvidence: string[];
};

export type SessionMeaningConfidence = {
  overall: number;
  hasConfirmedSignals: boolean;
  eventCount: number;
  draftCount: number;
  signalCount: number;
};

/** PHASE 6 Step 12: следующие шаги после сессии (rule-based, без выдумки). */
export type SessionMeaningNextPlayerActions = {
  playerId: string;
  playerName: string;
  actions: string[];
};

export type SessionMeaningNextActions = {
  team: string[];
  players: SessionMeaningNextPlayerActions[];
  nextTrainingFocus: string[];
};

/** PHASE 6 Step 15: сдвиг относительно прошлой подтверждённой сессии. */
export type SessionMeaningPlayerProgress = {
  playerId: string;
  playerName: string;
  progress: "improved" | "no_change" | "regressed";
  note: string;
};

export type SessionMeaningProgress = {
  team: string[];
  players: SessionMeaningPlayerProgress[];
};

/** PHASE 6 Step 16: зафиксированное «решение Арены» (без автодействий). */
export type SessionMeaningActionTriggerType =
  | "extra_training"
  | "attention_required"
  | "progress_high";

export type SessionMeaningActionTrigger = {
  type: SessionMeaningActionTriggerType;
  target: "player" | "team";
  playerId?: string;
  reason: string;
};

export type SessionMeaning = {
  version: typeof SESSION_MEANING_VERSION;
  builtAt: string;
  context: SessionMeaningContext;
  themes: SessionMeaningTheme[];
  focus: SessionMeaningFocus[];
  team: SessionMeaningTeam;
  players: SessionMeaningPlayer[];
  confidence: SessionMeaningConfidence;
  /** Отсутствует в старых JSON до Step 12 — клиенты делают fallback. */
  nextActions?: SessionMeaningNextActions;
  /** PHASE 6 Step 15: опционально, если найдена предыдущая confirmed сессия с валидным смыслом. */
  progress?: SessionMeaningProgress;
  /** PHASE 6 Step 16: триггеры инициативы Арены (только запись в смысл). */
  actionTriggers?: SessionMeaningActionTrigger[];
};

export function parsePersistedSessionMeaning(raw: unknown): SessionMeaning | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== SESSION_MEANING_VERSION) return null;
  if (typeof o.builtAt !== "string") return null;
  if (!o.context || typeof o.context !== "object") return null;
  if (!Array.isArray(o.themes) || !Array.isArray(o.focus) || !Array.isArray(o.players)) return null;
  if (!o.team || typeof o.team !== "object") return null;
  if (!o.confidence || typeof o.confidence !== "object") return null;
  return raw as SessionMeaning;
}

const MAX_THEMES = 16;
const MAX_FOCUS = 8;
const MAX_TEAM_LINES = 12;
const MAX_PLAYERS = 24;
const MAX_EVIDENCE_SAMPLES = 3;
const EVIDENCE_CLIP = 140;

const NEXT_ACTION_MAX_LEN = 78;
/** Тот же порог, что у `buildSessionMeaningNextActions` — перенос на следующий старт только при достаточной опоре на данные. */
export const SESSION_MEANING_NEXT_ACTIONS_LOW_CONFIDENCE = 0.34;

/** Общий гейт для nextActions, carry на следующий старт и parentActions (не выдумывать при «пустой» сессии). */
export function sessionMeaningPassesNextActionsConfidenceGate(
  meaning: Pick<SessionMeaning, "confidence" | "team" | "themes" | "focus">
): boolean {
  const { confidence, team, themes, focus } = meaning;
  const activity = confidence.eventCount + confidence.draftCount + confidence.signalCount;
  const hasTextSignals =
    team.needsAttentionLines.length > 0 ||
    team.positiveLines.length > 0 ||
    themes.length > 0 ||
    focus.length > 0;
  if (activity === 0 && !hasTextSignals) return false;
  if (
    confidence.overall < SESSION_MEANING_NEXT_ACTIONS_LOW_CONFIDENCE &&
    confidence.signalCount === 0 &&
    confidence.eventCount + confidence.draftCount < 2 &&
    team.needsAttentionLines.length === 0
  ) {
    return false;
  }
  return true;
}

function shortNextActionLine(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * Rule-based «следующие шаги» только из уже собранных полей смысла (без LLM).
 */
export function buildSessionMeaningNextActions(input: {
  themes: SessionMeaningTheme[];
  focus: SessionMeaningFocus[];
  team: SessionMeaningTeam;
  players: SessionMeaningPlayer[];
  confidence: SessionMeaningConfidence;
}): SessionMeaningNextActions {
  const empty = (): SessionMeaningNextActions => ({
    team: [],
    players: [],
    nextTrainingFocus: [],
  });

  const { themes, focus, team, players, confidence } = input;

  if (!sessionMeaningPassesNextActionsConfidenceGate({ confidence, team, themes, focus })) {
    return empty();
  }

  const teamOut: string[] = [];
  const seenTeam = new Set<string>();
  const pushTeam = (raw: string) => {
    const s = shortNextActionLine(raw, NEXT_ACTION_MAX_LEN);
    if (!s) return;
    const k = s.toLowerCase();
    if (seenTeam.has(k)) return;
    seenTeam.add(k);
    teamOut.push(s);
  };

  for (const line of team.needsAttentionLines) {
    pushTeam(line);
    if (teamOut.length >= 3) break;
  }

  const sortedThemes = [...themes].sort((a, b) => b.weight - a.weight);
  let ti = 0;
  while (teamOut.length < 3 && ti < sortedThemes.length) {
    const key = sortedThemes[ti]!.key.trim();
    ti += 1;
    if (!key) continue;
    pushTeam(`Закрепить командный акцент: ${key}`);
  }

  let pi = 0;
  while (teamOut.length < 3 && pi < team.positiveLines.length) {
    const line = team.positiveLines[pi]!.trim();
    pi += 1;
    if (!line) continue;
    pushTeam(`Поддержать прогресс: ${shortNextActionLine(line, 56)}`);
  }

  const focusPlayers = players.slice(0, 4);
  const playersOut: SessionMeaningNextPlayerActions[] = [];
  for (const p of focusPlayers) {
    const total = p.positiveCount + p.negativeCount + p.neutralCount;
    if (total === 0 && p.sampleEvidence.length === 0 && p.topThemes.length === 0) continue;

    const actions: string[] = [];
    const seenA = new Set<string>();
    const pushA = (raw: string) => {
      const s = shortNextActionLine(raw, NEXT_ACTION_MAX_LEN);
      if (!s) return;
      const k = s.toLowerCase();
      if (seenA.has(k)) return;
      seenA.add(k);
      actions.push(s);
    };

    for (const ev of p.sampleEvidence) {
      if (actions.length >= 2) break;
      const e = ev.trim();
      if (e) pushA(`Отработать: ${shortNextActionLine(e, 52)}`);
    }
    for (const dom of p.topThemes) {
      if (actions.length >= 2) break;
      const d = dom.trim();
      if (d) pushA(`Фокус персонально: ${d}`);
    }
    if (actions.length === 0 && total > 0) {
      const d0 = p.topThemes[0]?.trim();
      if (d0) pushA(`Вернуться к теме: ${d0}`);
    }
    if (actions.length > 0) {
      playersOut.push({
        playerId: p.playerId,
        playerName: p.playerName,
        actions: actions.slice(0, 2),
      });
    }
  }

  const nextTrainingFocus: string[] = [];
  const seenF = new Set<string>();
  const pushF = (raw: string) => {
    const s = shortNextActionLine(raw, NEXT_ACTION_MAX_LEN);
    if (!s) return;
    const k = s.toLowerCase();
    if (seenF.has(k)) return;
    seenF.add(k);
    nextTrainingFocus.push(s);
  };

  for (const f of [...focus].sort((a, b) => b.weight - a.weight)) {
    if (nextTrainingFocus.length >= 3) break;
    if (f.label.trim()) pushF(`След. тренировка — ${f.label.trim()}`);
  }
  for (const th of sortedThemes) {
    if (nextTrainingFocus.length >= 3) break;
    if (th.key.trim()) pushF(`След. тренировка — ${th.key.trim()}`);
  }

  return {
    team: teamOut.slice(0, 3),
    players: playersOut,
    nextTrainingFocus: nextTrainingFocus.slice(0, 3),
  };
}

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function bumpTheme(
  map: Map<string, { weight: number; sources: Set<SessionMeaningTheme["sources"][number]> }>,
  key: string,
  source: SessionMeaningTheme["sources"][number],
  delta = 1
) {
  const k = key.trim();
  if (!k) return;
  const cur = map.get(k) ?? { weight: 0, sources: new Set() };
  cur.weight += delta;
  cur.sources.add(source);
  map.set(k, cur);
}

function parseSummaryNotes(raw: unknown): { needsAttentionLines: string[]; positiveLines: string[] } {
  if (!raw || typeof raw !== "object") {
    return { needsAttentionLines: [], positiveLines: [] };
  }
  const o = raw as Record<string, unknown>;
  const notes = o.notes;
  if (!notes || typeof notes !== "object") {
    return { needsAttentionLines: [], positiveLines: [] };
  }
  const n = notes as Record<string, unknown>;
  const na = Array.isArray(n.needsAttention) ? n.needsAttention : [];
  const pos = Array.isArray(n.positives) ? n.positives : [];
  const lineFrom = (x: unknown): string | null => {
    if (!x || typeof x !== "object") return null;
    const t = (x as Record<string, unknown>).text;
    return typeof t === "string" && t.trim() ? clip(t, 220) : null;
  };
  return {
    needsAttentionLines: na.map(lineFrom).filter((x): x is string => x != null).slice(0, MAX_TEAM_LINES),
    positiveLines: pos.map(lineFrom).filter((x): x is string => x != null).slice(0, MAX_TEAM_LINES),
  };
}

function parseSummaryFocusDomains(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  const fd = o.focusDomains;
  if (!Array.isArray(fd)) return [];
  return fd
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim())
    .slice(0, MAX_FOCUS);
}

function parseSummaryPlayers(raw: unknown): Array<{ playerId: string; playerName: string }> {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  const pl = o.players;
  if (!Array.isArray(pl)) return [];
  const out: Array<{ playerId: string; playerName: string }> = [];
  for (const row of pl) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.playerId === "string" ? r.playerId.trim() : "";
    if (!id) continue;
    const name = typeof r.playerName === "string" ? r.playerName.trim() : "Игрок";
    out.push({ playerId: id, playerName: name || "Игрок" });
  }
  return out;
}

/**
 * Собирает SessionMeaning из текущих Prisma-данных сессии (events, drafts, signals, optional summaryJson).
 */
export async function buildSessionMeaningFromCurrentState(
  sessionId: string
): Promise<SessionMeaning | null> {
  const session = await prisma.liveTrainingSession.findUnique({
    where: { id: sessionId },
    include: {
      Team: { select: { name: true } },
      LiveTrainingEvent: { orderBy: { createdAt: "desc" }, take: 300 },
      LiveTrainingObservationDraft: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 300,
      },
      LiveTrainingPlayerSignal: {
        select: {
          playerId: true,
          signalDirection: true,
          metricDomain: true,
          evidenceText: true,
        },
        take: 800,
      },
      LiveTrainingSessionReportDraft: { select: { summaryJson: true } },
    },
  });

  if (!session) return null;

  const summaryRaw = session.LiveTrainingSessionReportDraft?.summaryJson ?? null;
  const summaryNotes = parseSummaryNotes(summaryRaw);
  const summaryFocus = parseSummaryFocusDomains(summaryRaw);
  const summaryPlayers = parseSummaryPlayers(summaryRaw);

  const themeAcc = new Map<
    string,
    { weight: number; sources: Set<SessionMeaningTheme["sources"][number]> }
  >();

  for (const ev of session.LiveTrainingEvent) {
    const c = ev.category?.trim();
    if (c) bumpTheme(themeAcc, c, "event_category", 1);
  }
  for (const d of session.LiveTrainingObservationDraft) {
    const c = d.category?.trim();
    if (c) bumpTheme(themeAcc, c, "draft_category", 1);
  }
  for (const s of session.LiveTrainingPlayerSignal) {
    const dom = s.metricDomain?.trim();
    if (dom) bumpTheme(themeAcc, dom, "signal_domain", 2);
  }
  for (const f of summaryFocus) {
    bumpTheme(themeAcc, f, "summary_focus", 1);
  }

  const themes: SessionMeaningTheme[] = [...themeAcc.entries()]
    .map(([key, v]) => ({
      key,
      weight: v.weight,
      sources: [...v.sources],
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_THEMES);

  const focus: SessionMeaningFocus[] = summaryFocus.map((label, i) => ({
    label,
    weight: Math.max(1, MAX_FOCUS - i),
  }));

  let posT = 0;
  let negT = 0;
  let neuT = 0;
  for (const s of session.LiveTrainingPlayerSignal) {
    if (s.signalDirection === "positive") posT += 1;
    else if (s.signalDirection === "negative") negT += 1;
    else neuT += 1;
  }

  const team: SessionMeaningTeam = {
    signalTotals: { positive: posT, negative: negT, neutral: neuT },
    needsAttentionLines: summaryNotes.needsAttentionLines,
    positiveLines: summaryNotes.positiveLines,
  };

  const playerIdSet = new Set<string>();
  for (const s of session.LiveTrainingPlayerSignal) playerIdSet.add(s.playerId);
  for (const d of session.LiveTrainingObservationDraft) {
    if (d.playerId) playerIdSet.add(d.playerId);
  }
  for (const e of session.LiveTrainingEvent) {
    if (e.playerId) playerIdSet.add(e.playerId);
  }
  for (const p of summaryPlayers) playerIdSet.add(p.playerId);

  const nameById = new Map<string, string>();
  for (const p of summaryPlayers) {
    nameById.set(p.playerId, p.playerName);
  }
  if (playerIdSet.size > 0) {
    const rows = await prisma.player.findMany({
      where: { id: { in: [...playerIdSet] } },
      select: { id: true, firstName: true, lastName: true },
    });
    for (const r of rows) {
      const nm = [r.firstName, r.lastName].filter(Boolean).join(" ").trim();
      if (nm) nameById.set(r.id, nm);
    }
  }

  type PAgg = {
    pos: number;
    neg: number;
    neu: number;
    domains: Map<string, number>;
    evidence: string[];
  };
  const byPlayer = new Map<string, PAgg>();

  function ensureAgg(pid: string): PAgg {
    let a = byPlayer.get(pid);
    if (!a) {
      a = { pos: 0, neg: 0, neu: 0, domains: new Map(), evidence: [] };
      byPlayer.set(pid, a);
    }
    return a;
  }

  for (const s of session.LiveTrainingPlayerSignal) {
    const agg = ensureAgg(s.playerId);
    if (s.signalDirection === "positive") agg.pos += 1;
    else if (s.signalDirection === "negative") agg.neg += 1;
    else agg.neu += 1;
    const dom = s.metricDomain?.trim();
    if (dom) agg.domains.set(dom, (agg.domains.get(dom) ?? 0) + 1);
    const ev = s.evidenceText?.trim();
    if (ev && agg.evidence.length < MAX_EVIDENCE_SAMPLES * 2) {
      const c = clip(ev, EVIDENCE_CLIP);
      if (!agg.evidence.includes(c)) agg.evidence.push(c);
    }
  }

  const players: SessionMeaningPlayer[] = [...playerIdSet]
    .map((playerId) => {
      const agg = byPlayer.get(playerId) ?? {
        pos: 0,
        neg: 0,
        neu: 0,
        domains: new Map<string, number>(),
        evidence: [] as string[],
      };
      const topThemes = [...agg.domains.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([d]) => d);
      return {
        playerId,
        playerName: nameById.get(playerId) ?? "Игрок",
        positiveCount: agg.pos,
        negativeCount: agg.neg,
        neutralCount: agg.neu,
        topThemes,
        sampleEvidence: agg.evidence.slice(0, MAX_EVIDENCE_SAMPLES),
      };
    })
    .sort((a, b) => b.positiveCount + b.negativeCount + b.neutralCount - (a.positiveCount + a.negativeCount + a.neutralCount))
    .slice(0, MAX_PLAYERS);

  const eventCount = session.LiveTrainingEvent.length;
  const draftCount = session.LiveTrainingObservationDraft.length;
  const signalCount = session.LiveTrainingPlayerSignal.length;
  const density = Math.min(
    1,
    0.2 + eventCount * 0.015 + draftCount * 0.02 + signalCount * 0.04
  );
  const confidence: SessionMeaningConfidence = {
    overall: Math.round(density * 100) / 100,
    hasConfirmedSignals: signalCount > 0,
    eventCount,
    draftCount,
    signalCount,
  };

  const context: SessionMeaningContext = {
    liveTrainingSessionId: session.id,
    teamId: session.teamId,
    teamName: session.Team?.name?.trim() ?? null,
    status: session.status,
    mode: session.mode,
    trainingSessionId: session.trainingSessionId,
    startedAt: session.startedAt.toISOString(),
    confirmedAt: session.confirmedAt?.toISOString() ?? null,
  };

  const nextActions = buildSessionMeaningNextActions({
    themes,
    focus,
    team,
    players,
    confidence,
  });

  const baseMeaning: SessionMeaning = {
    version: SESSION_MEANING_VERSION,
    builtAt: new Date().toISOString(),
    context,
    themes,
    focus,
    team,
    players,
    confidence,
    nextActions,
  };

  let progress: SessionMeaningProgress | undefined;
  try {
    const prevRow = await prisma.liveTrainingSession.findFirst({
      where: {
        teamId: session.teamId,
        coachId: session.coachId,
        status: "confirmed",
        id: { not: sessionId },
      },
      orderBy: [{ confirmedAt: "desc" }, { updatedAt: "desc" }],
      select: { sessionMeaningJson: true },
    });
    const prevMeaning = parsePersistedSessionMeaning(prevRow?.sessionMeaningJson);
    if (prevMeaning) {
      const { buildSessionMeaningProgressBlock } = await import("./session-meaning-progress");
      progress = buildSessionMeaningProgressBlock(prevMeaning, baseMeaning);
    }
  } catch {
    progress = undefined;
  }

  const meaningWithProgress: SessionMeaning = {
    ...baseMeaning,
    ...(progress ? { progress } : {}),
  };

  let actionTriggers: SessionMeaning["actionTriggers"];
  try {
    const { buildSessionMeaningActionTriggers } = await import("./session-meaning-action-triggers");
    const built = buildSessionMeaningActionTriggers(meaningWithProgress);
    actionTriggers = built.length > 0 ? built : undefined;
  } catch {
    actionTriggers = undefined;
  }

  return {
    ...meaningWithProgress,
    ...(actionTriggers ? { actionTriggers } : {}),
  };
}

/**
 * Пересобирает и сохраняет SessionMeaning. Ошибки логируются, наружу не пробрасываются (не ломает основной flow).
 */
export async function updateSessionMeaning(sessionId: string): Promise<void> {
  try {
    const meaning = await buildSessionMeaningFromCurrentState(sessionId);
    if (!meaning) return;
    await prisma.liveTrainingSession.update({
      where: { id: sessionId },
      data: { sessionMeaningJson: meaning as unknown as Prisma.InputJsonValue },
    });
  } catch (e) {
    console.warn("[session-meaning] updateSessionMeaning failed:", sessionId, e);
  }
}
