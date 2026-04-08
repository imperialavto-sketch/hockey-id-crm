/**
 * Parent-facing «последняя тренировка» — канонический `TrainingSessionReport`
 * + опционально Arena: привязка к `LiveTrainingSession` через прямой FK `trainingSessionId`
 * (канон), затем read-time по снимку (`scheduleSlotContext.trainingSlotId`), затем эвристика по времени.
 *
 * GUARDRAIL — `docs/architecture/HOCKEY_ID_SSOT.md`, `docs/architecture/HOCKEY_ID_USAGE_INVENTORY.md`:
 * Published-report storage SSOT remains `TrainingSessionReport`. This module is a **mixed read model**:
 * it may compose published rows with live-session / draft / heuristic fallbacks for parent UX.
 * Do not treat API output here as equivalent to the canonical persisted published report row alone.
 */

import { LiveTrainingSessionStatus, type LiveTrainingMode } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseLiveTrainingContinuitySnapshotFromDb } from "@/lib/live-training/live-training-continuity-lock-in";
import { buildArenaParentSummary } from "@/lib/arena/parent/buildArenaParentSummary";
import { buildArenaParentGuidance } from "@/lib/arena/parent/buildArenaParentGuidance";
import type { ArenaParentGuidance } from "@/lib/arena/parent/arenaParentGuidanceTypes";
import type { ArenaParentSummary } from "@/lib/arena/parent/arenaParentSummaryTypes";
import type { ArenaParentExplanation } from "@/lib/arena/parent/arenaParentExplanationTypes";
import {
  listParentFacingPublishedSessionReports,
  type ParentFacingSessionReport,
} from "@/lib/parent-players";
import { loadEnrichedLiveTrainingDraftsForSession } from "@/lib/live-training/service";
import { parsePlanningSnapshotFromDb } from "@/lib/live-training/live-training-planning-snapshot";
import { getCanonicalTrainingSessionIdFromLiveRow } from "@/lib/live-training/resolve-live-training-to-training-session";
import { buildExternalWorkImpactV1 } from "./external-work-impact-v1";
import { buildParentActionsFromSessionMeaning } from "./parent-actions-from-session-meaning";
import type { LiveTrainingParentMeaningActionRow } from "./parent-actions-from-session-meaning";
import type { SessionMeaning } from "./session-meaning";
import { parsePersistedSessionMeaning } from "./session-meaning";
import type { LiveTrainingSessionReportDraftSummary } from "./live-training-session-report-draft";
import {
  buildSuggestedActionsFromSessionMeaning,
  projectSuggestedActionsFromDraftSummary,
} from "./session-meaning-suggested-actions";
import { EXTERNAL_COACH_RECOMMENDATION_STATUS } from "@/lib/external-coach/external-coach-recommendation-service";

const MAX_HIGHLIGHTS = 3;
const MAX_FOCUS = 2;
const MAX_LINE = 220;
const MAX_SHORT = 180;
/**
 * Fallback-only: окно сопоставления слота и live-сессии, если нет FK и не удалось сопоставить по снимку.
 * Убирать, когда все релевантные строки имеют `trainingSessionId` или однозначный `trainingSlotId` в снимке.
 */
const LIVE_SESSION_MATCH_WINDOW_MS = 48 * 3600000;

export type ParentLatestLiveTrainingObservationDraftDto = {
  id: string;
  sourceText: string;
  parentExplanation?: ArenaParentExplanation | null;
};

export type ParentLatestLiveTrainingSummaryDto =
  | { hasData: false }
  | {
      hasData: true;
      /** Канонический отчёт (`TrainingSessionReport`) или чтение напрямую из live-сессии. */
      source: "published" | "live_session_fallback";
      isPublished: boolean;
      sessionMeta: {
        teamLabel: string;
        modeLabel: string;
        dateLabel: string;
      };
      counters: {
        totalSignals: number;
        positiveCount: number;
        negativeCount: number;
        neutralCount: number;
      };
      highlights: string[];
      developmentFocus: string[];
      supportNotes: string[];
      shortSummary: string;
      observationDrafts?: ParentLatestLiveTrainingObservationDraftDto[];
      arenaSummary?: ArenaParentSummary;
      arenaGuidance?: ArenaParentGuidance;
      /** PHASE 6 Step 14: подсказки «дома / вне льда» для этого игрока (из SessionMeaning). */
      parentActions?: LiveTrainingParentMeaningActionRow[];
      /** PHASE 6 Step 15 */
      progressHeadlineRu?: string;
      /** PHASE 6 Step 16: только progress_high, релевантно этому игроку или команде. */
      arenaSafeRecommendations?: Array<{
        type: "progress_high";
        target: "player" | "team";
        playerId?: string;
        reason: string;
      }>;
      /** PHASE 6 Step 17: карточки «что можно сделать» (только progress_high, по игроку/команде). */
      suggestedParentActions?: Array<{
        type: "progress_high";
        playerId?: string;
        title: string;
        description: string;
      }>;
      /**
       * STEP 20: только подтверждённый тренером внешний подбор (`ExternalCoachRecommendation`),
       * без чтения suggestedActions для родителя.
       */
      confirmedExternalCoachRecommendation?: {
        playerId?: string;
        coach: { id: string; name: string; skills: string[] };
        reason: string;
      } | null;
      /**
       * STEP 23: результат внешней работы — только при confirmed recommendation и наличии ExternalCoachFeedback.
       */
      externalCoachFeedbackSummary?: {
        coachName: string;
        summary: string;
        focusAreas: string[];
      } | null;
      /**
       * STEP 24: влияние доп. работы на эту тренировку — только для этого игрока,
       * без needs_more_time и внутренних формулировок.
       */
      externalWorkImpactParent?: {
        status: "helped" | "no_clear_effect";
        note: string;
      } | null;
      /** Канонический id слота `TrainingSession` для GET .../behavioral-suggestions (родительский контур). */
      trainingSessionId?: string | null;
    };

/** Сводка по одной сессии для PHASE 14 (parent story); без полей источника (добавляются в entrypoint). */
export type ParentLiveTrainingScopedSummary = Omit<
  Extract<ParentLatestLiveTrainingSummaryDto, { hasData: true }>,
  "source" | "isPublished"
>;

function truncateLine(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Только безопасные для родителя типы строки рекомендации (без внутренних триггеров). */
const PARENT_VISIBLE_EXTERNAL_COACH_TRIGGER_TYPES = new Set(["extra_training"]);

const MAX_PARENT_EXTERNAL_COACH_REASON = 240;
const MAX_PARENT_FEEDBACK_SUMMARY = 800;
const MAX_PARENT_FEEDBACK_FOCUS = 3;

function parentFacingReasonFromExternalCoachTrigger(triggerType: string): string {
  const t = triggerType.trim();
  if (t === "extra_training") {
    return "Тренер подтвердил идею дополнительной работы с узким специалистом.";
  }
  return "";
}

type ParentExternalCoachParentPayload = {
  confirmed: NonNullable<
    Extract<ParentLatestLiveTrainingSummaryDto, { hasData: true }>["confirmedExternalCoachRecommendation"]
  > | null;
  feedbackSummary: NonNullable<
    Extract<ParentLatestLiveTrainingSummaryDto, { hasData: true }>["externalCoachFeedbackSummary"]
  > | null;
};

/**
 * Одна строка recommendation для родителя + опционально feedback по ней (та же логика выбора: игрок, иначе команда).
 */
async function loadParentExternalCoachAndFeedbackForSession(
  liveSessionId: string,
  childPlayerId: string
): Promise<ParentExternalCoachParentPayload> {
  const empty: ParentExternalCoachParentPayload = { confirmed: null, feedbackSummary: null };
  const rows = await prisma.externalCoachRecommendation.findMany({
    where: {
      liveSessionId,
      status: EXTERNAL_COACH_RECOMMENDATION_STATUS.confirmed,
      OR: [{ playerId: childPlayerId }, { playerId: null }],
    },
    include: {
      ExternalCoach: { select: { id: true, name: true, skills: true } },
      ExternalCoachFeedback: { select: { summary: true, focusAreas: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const safe = rows.filter((r) => PARENT_VISIBLE_EXTERNAL_COACH_TRIGGER_TYPES.has(r.triggerType.trim()));
  const forPlayer = safe.find((r) => r.playerId === childPlayerId);
  const teamLevel = safe.find((r) => r.playerId === null);
  const chosen = forPlayer ?? teamLevel ?? null;
  if (!chosen?.ExternalCoach) return empty;

  const reasonRaw = parentFacingReasonFromExternalCoachTrigger(chosen.triggerType);
  if (!reasonRaw.trim()) return empty;

  const name = chosen.ExternalCoach.name?.trim() ?? "";
  if (!name) return empty;

  const skills = Array.isArray(chosen.ExternalCoach.skills)
    ? chosen.ExternalCoach.skills
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim())
    : [];

  const confirmed: ParentExternalCoachParentPayload["confirmed"] = {
    coach: {
      id: chosen.ExternalCoach.id,
      name,
      skills,
    },
    reason: truncateLine(reasonRaw, MAX_PARENT_EXTERNAL_COACH_REASON),
  };
  if (chosen.playerId) {
    confirmed.playerId = chosen.playerId;
  }

  let feedbackSummary: ParentExternalCoachParentPayload["feedbackSummary"] = null;
  const fb = chosen.ExternalCoachFeedback;
  if (fb && typeof fb.summary === "string" && fb.summary.trim()) {
    const focusAreas = Array.isArray(fb.focusAreas)
      ? fb.focusAreas
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .map((x) => truncateLine(x.trim(), 220))
          .slice(0, MAX_PARENT_FEEDBACK_FOCUS)
      : [];
    feedbackSummary = {
      coachName: name,
      summary: truncateLine(fb.summary.trim(), MAX_PARENT_FEEDBACK_SUMMARY),
      focusAreas,
    };
  }

  return { confirmed, feedbackSummary };
}

function formatRuSessionDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function liveTrainingModeLabelRu(mode: LiveTrainingMode | string): string {
  const m = String(mode).toLowerCase();
  if (m === "ofp") return "ОФП";
  if (m === "mixed") return "Смешанный формат";
  return "Лёд";
}

async function collectTeamIdsForPlayer(playerId: string): Promise<string[]> {
  const ids = new Set<string>();
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { teamId: true },
  });
  if (player?.teamId) ids.add(player.teamId);
  const attendances = await prisma.trainingAttendance.findMany({
    where: { playerId },
    select: { training: { select: { teamId: true } } },
    take: 150,
  });
  for (const a of attendances) {
    if (a.training?.teamId) ids.add(a.training.teamId);
  }
  return [...ids];
}

/**
 * Read-path fallback: последняя live-сессия команды ребёнка.
 * В схеме нет `finished`; берём live / review / confirmed (всё кроме cancelled).
 */
async function findLatestLiveTrainingSessionForParentFallback(playerId: string): Promise<{
  id: string;
  trainingSessionId: string | null;
  mode: LiveTrainingMode;
  startedAt: Date;
  confirmedAt: Date | null;
  sessionMeaningJson: Prisma.JsonValue | null;
  continuitySnapshotJson: Prisma.JsonValue | null;
  planningSnapshotJson: Prisma.JsonValue | null;
  Team: { name: string } | null;
  LiveTrainingSessionReportDraft: { summaryJson: Prisma.JsonValue } | null;
} | null> {
  const teamIds = await collectTeamIdsForPlayer(playerId);
  if (teamIds.length === 0) return null;
  const row = await prisma.liveTrainingSession.findFirst({
    where: {
      teamId: { in: teamIds },
      status: {
        in: [
          LiveTrainingSessionStatus.confirmed,
          LiveTrainingSessionStatus.live,
          LiveTrainingSessionStatus.review,
        ],
      },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      trainingSessionId: true,
      mode: true,
      startedAt: true,
      confirmedAt: true,
      sessionMeaningJson: true,
      continuitySnapshotJson: true,
      planningSnapshotJson: true,
      Team: { select: { name: true } },
      LiveTrainingSessionReportDraft: { select: { summaryJson: true } },
    },
  });
  return row;
}

function parseDraftSummaryFromRow(
  draftRow: { summaryJson: unknown } | null
): LiveTrainingSessionReportDraftSummary | null {
  if (!draftRow?.summaryJson || typeof draftRow.summaryJson !== "object") return null;
  return draftRow.summaryJson as LiveTrainingSessionReportDraftSummary;
}

/**
 * Сборка текстового каркаса без TrainingSessionReport: только JSON сессии / черновика / continuity (read-map).
 */
function buildFallbackScopedSummaryFromLiveSession(
  playerId: string,
  session: {
    trainingSessionId?: string | null;
    mode: LiveTrainingMode;
    startedAt: Date;
    sessionMeaningJson: unknown;
    continuitySnapshotJson: unknown;
    Team: { name: string } | null;
  },
  draftSummary: LiveTrainingSessionReportDraftSummary | null
): ParentLiveTrainingScopedSummary {
  const meaning = parsePersistedSessionMeaning(session.sessionMeaningJson);
  const continuity = parseLiveTrainingContinuitySnapshotFromDb(session.continuitySnapshotJson);
  const sm = draftSummary?.sessionMeta;
  const teamLabel = sm?.teamName?.trim() || session.Team?.name?.trim() || "";
  const modeLabel = sm?.mode?.trim()
    ? liveTrainingModeLabelRu(sm.mode)
    : liveTrainingModeLabelRu(session.mode);
  const dateIso = sm?.startedAt?.trim() ? sm.startedAt : session.startedAt.toISOString();
  const dateLabel = formatRuSessionDate(dateIso) || dateIso.slice(0, 10);

  const draftPlayer = draftSummary?.players?.find((p) => p.playerId === playerId);
  const meaningPlayer = meaning?.players?.find((p) => p.playerId === playerId);

  const totalSignals =
    draftPlayer?.totalSignals ??
    (meaningPlayer
      ? meaningPlayer.positiveCount + meaningPlayer.negativeCount + meaningPlayer.neutralCount
      : 0);
  const positiveCount = draftPlayer?.positiveCount ?? meaningPlayer?.positiveCount ?? 0;
  const negativeCount = draftPlayer?.negativeCount ?? meaningPlayer?.negativeCount ?? 0;
  const neutralCount = draftPlayer?.neutralCount ?? meaningPlayer?.neutralCount ?? 0;

  const highlights: string[] = [];
  const pushHighlight = (s: string) => {
    const t = truncateLine(s, MAX_LINE);
    if (t && !highlights.includes(t) && highlights.length < MAX_HIGHLIGHTS) highlights.push(t);
  };
  const narr = draftSummary?.coachPreviewNarrativeV1;
  if (narr?.playerHighlights) {
    for (const h of narr.playerHighlights) {
      if (h.playerId && h.playerId !== playerId) continue;
      const text = h.text?.trim() ?? "";
      if (text) pushHighlight(text);
    }
  }
  if (draftPlayer?.evidence) {
    for (const e of draftPlayer.evidence) {
      if (e.text?.trim()) pushHighlight(e.text);
    }
  }
  if (meaningPlayer?.sampleEvidence) {
    for (const l of meaningPlayer.sampleEvidence) {
      if (l?.trim()) pushHighlight(l);
    }
  }
  if (meaning?.team?.positiveLines) {
    for (const l of meaning.team.positiveLines) {
      if (l?.trim()) pushHighlight(l);
    }
  }

  const developmentFocus: string[] = [];
  const pushFocus = (s: string) => {
    const t = truncateLine(s, MAX_LINE);
    if (t && !developmentFocus.includes(t) && developmentFocus.length < MAX_FOCUS) developmentFocus.push(t);
  };
  if (draftSummary?.focusDomains) {
    for (const d of draftSummary.focusDomains) {
      if (d?.trim()) pushFocus(d);
    }
  }
  if (meaning?.focus) {
    for (const f of meaning.focus) {
      if (f.label?.trim()) pushFocus(f.label);
    }
  }
  if (meaning?.nextActions?.nextTrainingFocus) {
    for (const l of meaning.nextActions.nextTrainingFocus) {
      if (l?.trim()) pushFocus(l);
    }
  }

  const supportNotes: string[] = [];
  if (continuity?.summaryLines) {
    for (const l of continuity.summaryLines) {
      if (l?.trim() && supportNotes.length < MAX_FOCUS + 2) {
        supportNotes.push(truncateLine(l.trim(), MAX_LINE));
      }
    }
  }

  const shortSource =
    highlights[0] ??
    developmentFocus[0] ??
    supportNotes[0] ??
    "Сводка по последней тренировке (отчёт тренера ещё не опубликован).";

  const trainingSessionId =
    typeof session.trainingSessionId === "string" && session.trainingSessionId.trim()
      ? session.trainingSessionId.trim()
      : null;

  return {
    hasData: true,
    sessionMeta: { teamLabel, modeLabel, dateLabel },
    counters: {
      totalSignals,
      positiveCount,
      negativeCount,
      neutralCount,
    },
    highlights: highlights.slice(0, MAX_HIGHLIGHTS),
    developmentFocus,
    supportNotes,
    shortSummary: truncateLine(shortSource, MAX_SHORT),
    ...(trainingSessionId ? { trainingSessionId } : {}),
  };
}

type LoadedLiveSessionMeaningRow = {
  sessionMeaningJson: Prisma.JsonValue | null;
  planningSnapshotJson: Prisma.JsonValue | null;
};

/**
 * Общий read-path: SessionMeaning + черновик отчёта + внешний тренер + impact.
 * `requireMeaning: true` — как раньше для опубликованного отчёта (без meaning ничего не навешиваем).
 * `requireMeaning: false` — fallback: черновик / coach / impact без обязательного meaning.
 */
async function applyParentMeaningLayersFromLoadedSession(
  playerId: string,
  liveSessionId: string,
  row: LoadedLiveSessionMeaningRow,
  draftRow: { summaryJson: unknown } | null,
  base: ParentLiveTrainingScopedSummary,
  opts: { requireMeaning: boolean }
): Promise<ParentLiveTrainingScopedSummary> {
  const meaning = parsePersistedSessionMeaning(row.sessionMeaningJson);
  const draftSummary = parseDraftSummaryFromRow(draftRow);

  if (opts.requireMeaning && !meaning) {
    return base;
  }

  let out: ParentLiveTrainingScopedSummary = { ...base };

  if (meaning) {
    const actionRows = buildParentActionsFromSessionMeaning(meaning);
    const forChild = actionRows.filter((r) => r.playerId === playerId);
    if (forChild.length > 0) {
      out = { ...out, parentActions: forChild };
    }
    const ph = parentProgressHeadlineRuFromMeaning(meaning.progress, playerId);
    if (ph) {
      out = { ...out, progressHeadlineRu: ph };
    }
    const safeFromMeaning = (meaning.actionTriggers ?? []).filter(
      (t) =>
        t.type === "progress_high" &&
        (t.target === "team" || (t.target === "player" && t.playerId === playerId))
    );
    if (safeFromMeaning.length > 0) {
      out = {
        ...out,
        arenaSafeRecommendations: safeFromMeaning.map((t) => ({
          type: "progress_high" as const,
          target: t.target,
          ...(t.playerId ? { playerId: t.playerId } : {}),
          reason: t.reason,
        })),
      };
    }
  }

  const useDraftSuggested =
    draftSummary != null && draftSummary.sessionMeaningSuggestedActionsV1 != null;
  if (useDraftSuggested || meaning) {
    const suggestedForChild = useDraftSuggested
      ? projectSuggestedActionsFromDraftSummary(draftSummary!).parent.filter(
          (x) => !x.playerId || x.playerId === playerId
        )
      : (
          await buildSuggestedActionsFromSessionMeaning(meaning!)
        ).parent.filter((x) => !x.playerId || x.playerId === playerId);
    if (suggestedForChild.length > 0) {
      out = {
        ...out,
        suggestedParentActions: suggestedForChild.map((x) => ({ ...x })),
      };
    }
  }

  const { confirmed, feedbackSummary } = await loadParentExternalCoachAndFeedbackForSession(
    liveSessionId,
    playerId
  );
  out = {
    ...out,
    confirmedExternalCoachRecommendation: confirmed ?? null,
    externalCoachFeedbackSummary: feedbackSummary ?? null,
  };

  const draftImpactRow =
    draftSummary?.externalWorkImpactV1?.find(
      (r) =>
        r.playerId === playerId && (r.status === "helped" || r.status === "no_clear_effect")
    ) ??
    draftSummary?.externalWorkImpactV1?.find(
      (r) =>
        (r.playerId == null || r.playerId === "") &&
        (r.status === "helped" || r.status === "no_clear_effect")
    );

  if (opts.requireMeaning && meaning) {
    const snap = parsePlanningSnapshotFromDb(row.planningSnapshotJson);
    const impactRows = buildExternalWorkImpactV1({
      meaning,
      confirmedCarry: snap?.confirmedExternalDevelopmentCarry,
      feedbackCarry: snap?.externalCoachFeedbackCarry,
    });
    const mineImpact = impactRows.find((r) => r.playerId === playerId);
    if (
      mineImpact &&
      (mineImpact.status === "helped" || mineImpact.status === "no_clear_effect")
    ) {
      out = {
        ...out,
        externalWorkImpactParent: {
          status: mineImpact.status,
          note: mineImpact.note,
        },
      };
    }
  } else if (!opts.requireMeaning) {
    if (draftImpactRow?.note?.trim()) {
      out = {
        ...out,
        externalWorkImpactParent: {
          status: draftImpactRow.status as "helped" | "no_clear_effect",
          note: truncateLine(draftImpactRow.note.trim(), MAX_LINE),
        },
      };
    } else if (meaning) {
      const snap = parsePlanningSnapshotFromDb(row.planningSnapshotJson);
      const impactRows = buildExternalWorkImpactV1({
        meaning,
        confirmedCarry: snap?.confirmedExternalDevelopmentCarry,
        feedbackCarry: snap?.externalCoachFeedbackCarry,
      });
      const mineImpact = impactRows.find((r) => r.playerId === playerId);
      if (
        mineImpact &&
        (mineImpact.status === "helped" || mineImpact.status === "no_clear_effect")
      ) {
        out = {
          ...out,
          externalWorkImpactParent: {
            status: mineImpact.status,
            note: mineImpact.note,
          },
        };
      }
    }
  }

  return out;
}

function linesFromMultiline(s: string | null, cap: number): string[] {
  if (!s?.trim()) return [];
  const parts = s
    .split(/\r?\n/u)
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.slice(0, cap);
}

function mapFacingReportToSummaryDto(r: ParentFacingSessionReport): ParentLiveTrainingScopedSummary {
  const pmLines = linesFromMultiline(r.parentMessage, MAX_HIGHLIGHTS + 2);
  const sumLines = linesFromMultiline(r.summary, MAX_HIGHLIGHTS + 4);
  const focusLines = linesFromMultiline(r.focusAreas, MAX_FOCUS + 2);

  const highlights: string[] = [];
  for (const line of pmLines) {
    if (highlights.length >= MAX_HIGHLIGHTS) break;
    const t = truncateLine(line, MAX_LINE);
    if (t && !highlights.includes(t)) highlights.push(t);
  }
  for (const line of sumLines) {
    if (highlights.length >= MAX_HIGHLIGHTS) break;
    const t = truncateLine(line, MAX_LINE);
    if (t && !highlights.includes(t)) highlights.push(t);
  }

  const developmentFocus = focusLines
    .slice(0, MAX_FOCUS)
    .map((l) => truncateLine(l, MAX_LINE))
    .filter(Boolean);

  const shortSource =
    pmLines[0] ?? sumLines[0] ?? focusLines[0] ?? "Краткий отчёт тренера сохранён в приложении.";
  const shortSummary = truncateLine(shortSource, MAX_SHORT);

  return {
    hasData: true,
    sessionMeta: {
      teamLabel: r.teamName ?? "",
      modeLabel: r.sessionKindLabel,
      dateLabel: formatRuSessionDate(r.sessionStartedAt) || r.sessionStartedAt.slice(0, 10),
    },
    counters: {
      totalSignals: 0,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
    },
    highlights: highlights.slice(0, MAX_HIGHLIGHTS),
    developmentFocus,
    supportNotes: [],
    shortSummary,
    trainingSessionId: r.trainingId,
  };
}

/**
 * Канон: подтверждённая live-сессия с `trainingSessionId ===` id слота отчёта.
 */
async function resolveLiveTrainingSessionIdByDirectLink(
  trainingId: string,
  teamId: string
): Promise<string | null> {
  const row = await prisma.liveTrainingSession.findFirst({
    where: {
      trainingSessionId: trainingId,
      teamId,
      status: LiveTrainingSessionStatus.confirmed,
    },
    orderBy: [{ confirmedAt: "desc" }, { updatedAt: "desc" }],
    select: { id: true },
  });
  return row?.id ?? null;
}

/**
 * Совместимость для старых строк без FK: `planningSnapshotJson.scheduleSlotContext.trainingSlotId`
 * совпадает с id слота CRM.
 */
async function resolveLiveTrainingSessionIdBySnapshotTrainingSlot(
  trainingId: string,
  teamId: string
): Promise<string | null> {
  const rows = await prisma.liveTrainingSession.findMany({
    where: {
      teamId,
      status: LiveTrainingSessionStatus.confirmed,
      trainingSessionId: null,
    },
    select: { id: true, planningSnapshotJson: true },
    orderBy: { updatedAt: "desc" },
    take: 48,
  });
  for (const row of rows) {
    const slotId = getCanonicalTrainingSessionIdFromLiveRow({
      trainingSessionId: null,
      planningSnapshotJson: row.planningSnapshotJson,
    });
    if (slotId === trainingId) return row.id;
  }
  return null;
}

/**
 * Fallback (до Step 8): время подтверждения около `TrainingSession.startAt`.
 */
async function resolveLiveTrainingSessionIdHeuristic(
  training: { id: string; teamId: string; startAt: Date }
): Promise<string | null> {
  const targetMs = training.startAt.getTime();

  const candidates = await prisma.liveTrainingSession.findMany({
    where: {
      teamId: training.teamId,
      status: LiveTrainingSessionStatus.confirmed,
    },
    select: {
      id: true,
      confirmedAt: true,
      endedAt: true,
      startedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 48,
  });

  let best: { id: string; delta: number } | null = null;
  for (const c of candidates) {
    const anchor = c.confirmedAt ?? c.endedAt ?? c.startedAt;
    const delta = Math.abs(anchor.getTime() - targetMs);
    if (delta > LIVE_SESSION_MATCH_WINDOW_MS) continue;
    if (!best || delta < best.delta) {
      best = { id: c.id, delta };
    }
  }

  return best?.id ?? null;
}

/**
 * Сопоставление отчёта родителя с LiveTrainingSession для Arena-слоя.
 *
 * 1. Прямая связь `LiveTrainingSession.trainingSessionId` (канон).
 * 2. Read-time: снимок со `trainingSlotId` (старые строки без колонки).
 * 3. Эвристика по времени (обратная совместимость).
 */
async function resolveLiveTrainingSessionIdForParentReport(
  playerId: string,
  report: ParentFacingSessionReport
): Promise<string | null> {
  const training = await prisma.trainingSession.findUnique({
    where: { id: report.trainingId },
    select: { id: true, teamId: true, startAt: true },
  });
  if (!training) return null;

  const attendance = await prisma.trainingAttendance.findFirst({
    where: { trainingId: training.id, playerId },
  });
  if (!attendance) return null;

  const byLink = await resolveLiveTrainingSessionIdByDirectLink(training.id, training.teamId);
  if (byLink) return byLink;

  const bySnapshot = await resolveLiveTrainingSessionIdBySnapshotTrainingSlot(training.id, training.teamId);
  if (bySnapshot) return bySnapshot;

  return resolveLiveTrainingSessionIdHeuristic(training);
}

function parentProgressHeadlineRuFromMeaning(
  progress: SessionMeaning["progress"],
  childPlayerId: string
): string | undefined {
  if (!progress || (progress.team.length === 0 && progress.players.length === 0)) return undefined;
  const mine = progress.players.find((x) => x.playerId === childPlayerId);
  if (mine) {
    if (mine.progress === "regressed") return "Требует внимания";
    if (mine.progress === "improved") return "Есть прогресс";
    return "Без изменений";
  }
  if (progress.players.some((x) => x.progress === "regressed")) return "Требует внимания";
  if (
    progress.players.some((x) => x.progress === "improved") ||
    progress.team.some((t) => /меньше|узнаваем/i.test(t))
  ) {
    return "Есть прогресс";
  }
  return "Без изменений";
}

async function attachParentMeaningActionsForPlayer(
  playerId: string,
  report: ParentFacingSessionReport,
  base: ParentLiveTrainingScopedSummary
): Promise<ParentLiveTrainingScopedSummary> {
  const sessionId = await resolveLiveTrainingSessionIdForParentReport(playerId, report);
  if (!sessionId) return base;
  const [row, draftRow] = await Promise.all([
    prisma.liveTrainingSession.findUnique({
      where: { id: sessionId },
      select: { sessionMeaningJson: true, planningSnapshotJson: true },
    }),
    prisma.liveTrainingSessionReportDraft.findUnique({
      where: { liveTrainingSessionId: sessionId },
      select: { summaryJson: true },
    }),
  ]);
  if (!row) return base;
  return applyParentMeaningLayersFromLoadedSession(playerId, sessionId, row, draftRow, base, {
    requireMeaning: true,
  });
}

async function attachArenaLayerForLiveSession(
  playerId: string,
  liveSessionId: string,
  base: ParentLiveTrainingScopedSummary
): Promise<ParentLiveTrainingScopedSummary> {
  const enriched = await loadEnrichedLiveTrainingDraftsForSession(liveSessionId);
  const forPlayer = enriched.filter((d) => d.playerId === playerId);
  if (forPlayer.length === 0) return base;

  const observationDrafts: ParentLatestLiveTrainingObservationDraftDto[] = forPlayer.map((d) => ({
    id: d.id,
    sourceText: d.sourceText,
    ...(d.parentExplanation ? { parentExplanation: d.parentExplanation } : {}),
  }));

  const draftInputs = forPlayer.map((d) => ({
    interpretation: d.interpretation,
    coachDecision: d.coachDecision,
    parentExplanation: d.parentExplanation,
  }));

  const arenaSummary = buildArenaParentSummary({ drafts: draftInputs });

  const arenaGuidance = buildArenaParentGuidance({
    arenaSummary: arenaSummary ?? null,
    draftInputs,
  });

  return {
    ...base,
    observationDrafts,
    ...(arenaSummary ? { arenaSummary } : {}),
    ...(arenaGuidance ? { arenaGuidance } : {}),
  };
}

async function attachArenaLayerForParent(
  playerId: string,
  report: ParentFacingSessionReport,
  base: ParentLiveTrainingScopedSummary
): Promise<ParentLiveTrainingScopedSummary> {
  const sessionId = await resolveLiveTrainingSessionIdForParentReport(playerId, report);
  if (!sessionId) return base;
  return attachArenaLayerForLiveSession(playerId, sessionId, base);
}

/**
 * Несколько последних тренировок с опубликованным отчётом (TrainingSessionReport).
 * Без тяжёлого Arena-слоя (только текст отчёта).
 */
export async function getParentRecentScopedLiveTrainingSummaries(
  playerId: string,
  limit = 3
): Promise<ParentLiveTrainingScopedSummary[]> {
  const rows = await listParentFacingPublishedSessionReports(playerId, limit);
  return rows.map((r) => mapFacingReportToSummaryDto(r));
}

/**
 * Последняя тренировка: приоритет опубликованному `TrainingSessionReport`, иначе fallback на последнюю
 * `LiveTrainingSession` команды ребёнка (без изменения publish pipeline).
 * Доступ родителя проверяет route.
 */
export async function getParentLatestLiveTrainingSummaryForPlayer(
  playerId: string
): Promise<ParentLatestLiveTrainingSummaryDto> {
  const rows = await listParentFacingPublishedSessionReports(playerId, 1);
  if (rows.length > 0) {
    const report = rows[0]!;
    let base = mapFacingReportToSummaryDto(report);
    base = await attachParentMeaningActionsForPlayer(playerId, report, base);
    const scoped = await attachArenaLayerForParent(playerId, report, base);
    return { ...scoped, source: "published", isPublished: true };
  }

  const live = await findLatestLiveTrainingSessionForParentFallback(playerId);
  if (!live) return { hasData: false };

  const draftSummary = parseDraftSummaryFromRow(live.LiveTrainingSessionReportDraft);
  let base = buildFallbackScopedSummaryFromLiveSession(playerId, live, draftSummary);
  base = await applyParentMeaningLayersFromLoadedSession(
    playerId,
    live.id,
    {
      sessionMeaningJson: live.sessionMeaningJson,
      planningSnapshotJson: live.planningSnapshotJson,
    },
    live.LiveTrainingSessionReportDraft,
    base,
    { requireMeaning: false }
  );
  const scoped = await attachArenaLayerForLiveSession(playerId, live.id, base);
  return { ...scoped, source: "live_session_fallback", isPublished: false };
}
