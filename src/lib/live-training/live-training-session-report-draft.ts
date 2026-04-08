/**
 * Структурированный черновик отчёта по подтверждённой live training (PHASE 11).
 * Отдельно от PlayerTrainingReport / voice pipeline.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildLiveTrainingSessionOutcomeForSession } from "./live-training-session-outcome";
import type { SessionMeaningActionTrigger, SessionMeaningNextActions } from "./session-meaning";
import type { SessionMeaningSuggestedActions } from "./session-meaning-suggested-actions";
import { updateSessionMeaning } from "./session-meaning";
import { mergePersistedSessionMeaningIntoDraftSummary } from "./session-meaning-report-merge";
import { parsePersistedSessionMeaning, type SessionMeaning } from "./session-meaning";
import { buildExternalWorkImpactV1, type ExternalWorkImpactRowV1 } from "./external-work-impact-v1";
import { parsePlanningSnapshotFromDb } from "./live-training-planning-snapshot";
import { syncPendingExternalCoachRecommendations } from "@/lib/external-coach/external-coach-recommendation-service";

export type LiveTrainingReportDraftEvidenceItem = {
  text: string;
  direction: "positive" | "negative" | "neutral";
  domain: string;
};

export type LiveTrainingReportDraftPlayerSummary = {
  playerId: string;
  playerName: string;
  totalSignals: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  topDomains: string[];
  evidence: LiveTrainingReportDraftEvidenceItem[];
};

export type LiveTrainingReportDraftNoteItem = {
  text: string;
  playerId?: string;
  playerName?: string;
};

/**
 * Канонический текстовый слой превью тренера (сохранение в summaryJson через PATCH).
 * Не используется в parent/school проекциях.
 */
export type LiveTrainingCoachPreviewNarrativePlayerHighlightV1 = {
  playerId?: string | null;
  playerName?: string | null;
  /** Основной текст акцента (после нормализации из БД всегда заполнен, если есть контент). */
  text: string;
  /** Legacy ключ в сохранённом summaryJson; при чтении сливается в `text`, в запись не уходит. */
  summaryLine?: string | null;
};

export type LiveTrainingCoachPreviewNarrativeV1 = {
  sessionSummaryLines: string[];
  focusAreas: string[];
  playerHighlights: LiveTrainingCoachPreviewNarrativePlayerHighlightV1[];
};

/**
 * Слоты narrative, которые тренер явно сохранил через PATCH (в т.ч. пустыми).
 * Пока true — read-time гидратация из Arena не заполняет этот слот.
 */
export type LiveTrainingCoachPreviewNarrativeMetaV1 = {
  sessionSummaryLinesManuallyEdited: boolean;
  focusAreasManuallyEdited: boolean;
  playerHighlightsManuallyEdited: boolean;
};

export type LiveTrainingSessionReportDraftSummary = {
  sessionMeta: {
    teamName: string;
    mode: string;
    startedAt: string;
    endedAt: string | null;
    confirmedAt: string | null;
  };
  counters: {
    includedDraftsCount: number;
    signalsCreatedCount: number;
    affectedPlayersCount: number;
    positiveSignalsCount: number;
    negativeSignalsCount: number;
    neutralSignalsCount: number;
    excludedDraftsCount: number;
    draftsFlaggedNeedsReview: number;
  };
  focusDomains: string[];
  players: LiveTrainingReportDraftPlayerSummary[];
  notes: {
    needsAttention: LiveTrainingReportDraftNoteItem[];
    positives: LiveTrainingReportDraftNoteItem[];
  };
  /** Канонические строки для coach preview (персистится в summaryJson). */
  coachPreviewNarrativeV1?: LiveTrainingCoachPreviewNarrativeV1;
  /** Флаги ручного контроля слотов narrative (персистится в summaryJson). */
  coachPreviewNarrativeMetaV1?: LiveTrainingCoachPreviewNarrativeMetaV1;
  /** PHASE 6 Step 12: следующие шаги из SessionMeaning (read-model). */
  sessionMeaningNextActionsV1?: SessionMeaningNextActions;
  /** PHASE 6 Step 14: формулировки для родителя (дом/вне льда), из того же смысла. */
  sessionMeaningParentActionsV1?: Array<{
    playerId: string;
    playerName: string;
    actions: string[];
  }>;
  /** PHASE 6 Step 15: прогресс vs прошлая confirmed сессия. */
  sessionMeaningProgressV1?: {
    team: string[];
    players: Array<{
      playerId: string;
      playerName: string;
      progress: "improved" | "no_change" | "regressed";
      note: string;
    }>;
  };
  /** PHASE 6 Step 16: решения Арены (только read-model, без автодействий). */
  sessionMeaningActionTriggersV1?: SessionMeaningActionTrigger[];
  /** PHASE 6 Step 17: производные карточки действий из actionTriggers (при merge). */
  sessionMeaningSuggestedActionsV1?: SessionMeaningSuggestedActions;
  /** STEP 24: влияние подтверждённой внешней работы (производно от progress + planning carry). */
  externalWorkImpactV1?: ExternalWorkImpactRowV1[];
};

export type LiveTrainingSessionReportDraftDto = {
  id: string;
  liveTrainingSessionId: string;
  status: string;
  title: string;
  /** ISO; заполняется после публикации в `TrainingSessionReport`. */
  publishedAt: string | null;
  summary: LiveTrainingSessionReportDraftSummary;
};

const TOP_PLAYERS = 10;
const EVIDENCE_PER_PLAYER = 3;
const NOTES_CAP = 14;

/** STEP 24: read-time / merge-time производная; не пишет в SessionMeaning. */
export function attachExternalWorkImpactToDraftSummary(
  summary: LiveTrainingSessionReportDraftSummary,
  meaning: SessionMeaning | null,
  planningSnapshotJson: Prisma.JsonValue | null | undefined
): LiveTrainingSessionReportDraftSummary {
  const snap = parsePlanningSnapshotFromDb(planningSnapshotJson);
  const rows = buildExternalWorkImpactV1({
    meaning,
    confirmedCarry: snap?.confirmedExternalDevelopmentCarry,
    feedbackCarry: snap?.externalCoachFeedbackCarry,
  });
  if (rows.length === 0) {
    const next = { ...summary };
    delete next.externalWorkImpactV1;
    return next;
  }
  return { ...summary, externalWorkImpactV1: rows };
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Дополняет focusAreas narrative из nextActions, если тренер не пометил слот как ручной. */
function applyNextActionsToCoachNarrativeFocus(
  summary: LiveTrainingSessionReportDraftSummary
): LiveTrainingSessionReportDraftSummary {
  const na = summary.sessionMeaningNextActionsV1;
  if (!na?.nextTrainingFocus?.length) return summary;
  if (!summary.coachPreviewNarrativeV1) return summary;
  if (summary.coachPreviewNarrativeMetaV1?.focusAreasManuallyEdited) return summary;

  const prev = summary.coachPreviewNarrativeV1.focusAreas;
  const fa = [...prev];
  const seen = new Set(fa.map((x) => x.toLowerCase().trim()));
  for (const line of na.nextTrainingFocus) {
    const t = line.trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    fa.push(t);
    if (fa.length >= 12) break;
  }
  if (fa.length === prev.length) return summary;
  return {
    ...summary,
    coachPreviewNarrativeV1: {
      ...summary.coachPreviewNarrativeV1,
      focusAreas: fa,
    },
  };
}

/** Дополняет sessionSummaryLines из progress, если слот не ручной. */
function applyProgressToCoachNarrativeSummary(
  summary: LiveTrainingSessionReportDraftSummary
): LiveTrainingSessionReportDraftSummary {
  const pr = summary.sessionMeaningProgressV1;
  if (!pr || (pr.team.length === 0 && pr.players.length === 0)) return summary;
  if (!summary.coachPreviewNarrativeV1) return summary;
  if (summary.coachPreviewNarrativeMetaV1?.sessionSummaryLinesManuallyEdited) return summary;

  const prev = summary.coachPreviewNarrativeV1.sessionSummaryLines;
  const lines = [...prev];
  const seen = new Set(lines.map((x) => x.toLowerCase().trim()));
  for (const t of pr.team) {
    const s = t.trim();
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    lines.push(s);
    if (lines.length >= 14) break;
  }
  for (const pl of pr.players) {
    const s = `${pl.playerName}: ${pl.note}`.trim();
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    lines.push(s);
    if (lines.length >= 14) break;
  }
  if (lines.length === prev.length) return summary;
  return {
    ...summary,
    coachPreviewNarrativeV1: {
      ...summary.coachPreviewNarrativeV1,
      sessionSummaryLines: lines,
    },
  };
}

/**
 * После PATCH coachPreviewNarrative: заново влить производные поля из актуального SessionMeaning
 * и planning (next/parent actions, progress, triggers, suggestedActions merge, externalWorkImpact),
 * сохраняя sessionMeta/counters/players/notes из переданного summary. Порядок вызовов совпадает
 * с хвостом upsert перед записью в БД.
 */
export async function rehydrateMeaningDerivedFieldsOnDraftSummary(
  summary: LiveTrainingSessionReportDraftSummary,
  sessionId: string
): Promise<LiveTrainingSessionReportDraftSummary> {
  const session = await prisma.liveTrainingSession.findUnique({
    where: { id: sessionId },
    select: { sessionMeaningJson: true, planningSnapshotJson: true },
  });
  const meaning = parsePersistedSessionMeaning(session?.sessionMeaningJson);
  let out = await mergePersistedSessionMeaningIntoDraftSummary(summary, meaning);
  out = attachExternalWorkImpactToDraftSummary(out, meaning, session?.planningSnapshotJson);
  out = applyNextActionsToCoachNarrativeFocus(out);
  out = applyProgressToCoachNarrativeSummary(out);
  return out;
}

export function buildLiveTrainingSessionReportDraftTitle(session: {
  Team: { name: string };
  startedAt: Date;
}): string {
  const d = session.startedAt;
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `Живая тренировка · ${session.Team.name} · ${dateStr}`;
}

export async function buildLiveTrainingSessionReportDraftSummary(
  sessionId: string
): Promise<LiveTrainingSessionReportDraftSummary | null> {
  const session = await prisma.liveTrainingSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      mode: true,
      teamId: true,
      trainingSessionId: true,
      startedAt: true,
      endedAt: true,
      confirmedAt: true,
      sessionMeaningJson: true,
      planningSnapshotJson: true,
      Team: { select: { name: true } },
    },
  });
  if (!session || session.status !== "confirmed") {
    return null;
  }

  const outcome = await buildLiveTrainingSessionOutcomeForSession(sessionId);

  const [signals, reviewDrafts] = await Promise.all([
    prisma.liveTrainingPlayerSignal.findMany({
      where: { liveTrainingSessionId: sessionId },
      select: {
        playerId: true,
        signalDirection: true,
        metricDomain: true,
        evidenceText: true,
      },
    }),
    prisma.liveTrainingObservationDraft.findMany({
      where: { sessionId, deletedAt: null, needsReview: true },
      select: {
        playerId: true,
        playerNameRaw: true,
        sourceText: true,
      },
      take: 40,
    }),
  ]);

  type PAgg = {
    pos: number;
    neg: number;
    neu: number;
    domains: Map<string, number>;
  };
  const byPlayer = new Map<string, PAgg>();

  for (const s of signals) {
    let agg = byPlayer.get(s.playerId);
    if (!agg) {
      agg = { pos: 0, neg: 0, neu: 0, domains: new Map() };
      byPlayer.set(s.playerId, agg);
    }
    if (s.signalDirection === "positive") {
      agg.pos += 1;
    } else if (s.signalDirection === "negative") {
      agg.neg += 1;
    } else {
      agg.neu += 1;
    }
    agg.domains.set(s.metricDomain, (agg.domains.get(s.metricDomain) ?? 0) + 1);
  }

  const sorted = [...byPlayer.entries()].sort((a, b) => {
    const ta = a[1].pos + a[1].neg + a[1].neu;
    const tb = b[1].pos + b[1].neg + b[1].neu;
    return tb - ta;
  });
  const topPlayerIds = sorted.slice(0, TOP_PLAYERS).map(([id]) => id);

  const allNamePlayerIds = new Set<string>(topPlayerIds);
  for (const d of reviewDrafts) {
    if (d.playerId) allNamePlayerIds.add(d.playerId);
  }
  for (const s of signals) {
    allNamePlayerIds.add(s.playerId);
  }

  const playersDb =
    allNamePlayerIds.size > 0
      ? await prisma.player.findMany({
          where: { id: { in: [...allNamePlayerIds] } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
  const nameById = new Map(
    playersDb.map((p) => [
      p.id,
      [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "Игрок",
    ])
  );

  const players: LiveTrainingReportDraftPlayerSummary[] = topPlayerIds.map((pid) => {
    const agg = byPlayer.get(pid)!;
    const topDomains = [...agg.domains.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([d]) => d);

    const playerSignals = signals.filter((x) => x.playerId === pid);
    const seen = new Set<string>();
    const evidence: LiveTrainingReportDraftEvidenceItem[] = [];
    for (const ps of playerSignals) {
      const t = ps.evidenceText?.trim();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      evidence.push({
        text: truncate(t, 220),
        direction: ps.signalDirection,
        domain: ps.metricDomain,
      });
      if (evidence.length >= EVIDENCE_PER_PLAYER) break;
    }

    return {
      playerId: pid,
      playerName: nameById.get(pid) ?? "Игрок",
      totalSignals: agg.pos + agg.neg + agg.neu,
      positiveCount: agg.pos,
      negativeCount: agg.neg,
      neutralCount: agg.neu,
      topDomains,
      evidence,
    };
  });

  const needsAttention: LiveTrainingReportDraftNoteItem[] = [];
  const positives: LiveTrainingReportDraftNoteItem[] = [];

  for (const s of signals) {
    const raw = s.evidenceText?.trim() ?? "";
    if (!raw) continue;
    const text = truncate(raw, 200);
    const name = nameById.get(s.playerId) ?? "Игрок";
    if (s.signalDirection === "negative" && needsAttention.length < NOTES_CAP) {
      needsAttention.push({ text, playerId: s.playerId, playerName: name });
    } else if (s.signalDirection === "positive" && positives.length < NOTES_CAP) {
      positives.push({ text, playerId: s.playerId, playerName: name });
    }
  }

  for (const d of reviewDrafts) {
    if (needsAttention.length >= NOTES_CAP) break;
    const text = truncate(d.sourceText, 200);
    if (!text) continue;
    const pname =
      d.playerId != null
        ? nameById.get(d.playerId) ?? d.playerNameRaw?.trim() ?? "Игрок"
        : d.playerNameRaw?.trim() || "Без привязки к игроку";
    needsAttention.push({
      text,
      playerId: d.playerId ?? undefined,
      playerName: pname,
    });
  }

  const baseSummary: LiveTrainingSessionReportDraftSummary = {
    sessionMeta: {
      teamName: session.Team.name,
      mode: session.mode,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      confirmedAt: session.confirmedAt?.toISOString() ?? null,
    },
    counters: {
      includedDraftsCount: outcome.includedDraftsCount,
      signalsCreatedCount: outcome.signalsCreatedCount,
      affectedPlayersCount: outcome.affectedPlayersCount,
      positiveSignalsCount: outcome.positiveSignalsCount,
      negativeSignalsCount: outcome.negativeSignalsCount,
      neutralSignalsCount: outcome.neutralSignalsCount,
      excludedDraftsCount: outcome.excludedDraftsCount,
      draftsFlaggedNeedsReview: outcome.draftsFlaggedNeedsReview,
    },
    focusDomains: outcome.topDomains,
    players,
    notes: {
      needsAttention,
      positives,
    },
  };

  const persistedMeaning = parsePersistedSessionMeaning(session.sessionMeaningJson);
  const merged = await mergePersistedSessionMeaningIntoDraftSummary(baseSummary, persistedMeaning);
  return attachExternalWorkImpactToDraftSummary(
    merged,
    persistedMeaning,
    session.planningSnapshotJson
  );
}

export async function upsertLiveTrainingSessionReportDraft(sessionId: string): Promise<void> {
  const session = await prisma.liveTrainingSession.findUnique({
    where: { id: sessionId },
    include: { Team: { select: { name: true } } },
  });
  if (!session || session.status !== "confirmed") {
    return;
  }

  /** Смысл с сигналами confirm должен быть свежим до merge в summary (nextActions, focus). */
  await updateSessionMeaning(sessionId);

  const summary = await buildLiveTrainingSessionReportDraftSummary(sessionId);
  if (!summary) {
    return;
  }

  const title = buildLiveTrainingSessionReportDraftTitle(session);

  const existingRow = await prisma.liveTrainingSessionReportDraft.findUnique({
    where: { liveTrainingSessionId: sessionId },
    select: { summaryJson: true, status: true },
  });

  let summaryForWrite: LiveTrainingSessionReportDraftSummary = summary;
  if (existingRow?.summaryJson && typeof existingRow.summaryJson === "object") {
    const old = existingRow.summaryJson as Record<string, unknown>;
    if (old.coachPreviewNarrativeV1 != null && typeof old.coachPreviewNarrativeV1 === "object") {
      summaryForWrite = {
        ...summaryForWrite,
        coachPreviewNarrativeV1: old.coachPreviewNarrativeV1 as LiveTrainingSessionReportDraftSummary["coachPreviewNarrativeV1"],
      };
    }
    if (old.coachPreviewNarrativeMetaV1 != null && typeof old.coachPreviewNarrativeMetaV1 === "object") {
      summaryForWrite = {
        ...summaryForWrite,
        coachPreviewNarrativeMetaV1: old.coachPreviewNarrativeMetaV1 as LiveTrainingSessionReportDraftSummary["coachPreviewNarrativeMetaV1"],
      };
    }
  }

  summaryForWrite = applyNextActionsToCoachNarrativeFocus(summaryForWrite);
  summaryForWrite = applyProgressToCoachNarrativeSummary(summaryForWrite);

  const updateData: {
    title: string;
    summaryJson: Prisma.InputJsonValue;
    status?: "draft" | "ready";
  } = {
    title,
    summaryJson: summaryForWrite as unknown as Prisma.InputJsonValue,
  };
  /** Опубликованный черновик не откатываем в draft при пересборке summary. */
  if (existingRow?.status !== "ready") {
    updateData.status = "draft";
  }

  await prisma.liveTrainingSessionReportDraft.upsert({
    where: { liveTrainingSessionId: sessionId },
    create: {
      liveTrainingSessionId: sessionId,
      teamId: session.teamId,
      coachId: session.coachId,
      status: "draft",
      title,
      summaryJson: summaryForWrite as unknown as Prisma.InputJsonValue,
    },
    update: updateData,
  });

  try {
    await syncPendingExternalCoachRecommendations(sessionId, summaryForWrite);
  } catch (e) {
    console.warn("[live-training] syncPendingExternalCoachRecommendations failed:", sessionId, e);
  }
}

/** Алиас под название из PHASE 11 spec. */
export const buildLiveTrainingSessionReportDraft = buildLiveTrainingSessionReportDraftSummary;
