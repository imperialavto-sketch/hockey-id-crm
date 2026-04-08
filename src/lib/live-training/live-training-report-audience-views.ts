/**
 * PHASE 12: проекции черновика отчёта под аудитории (read-model поверх summaryJson, без LLM).
 * SSOT остаётся LiveTrainingSessionReportDraft.summaryJson.
 */

import type { LiveTrainingSessionReportDraftSummary } from "./live-training-session-report-draft";
import type { ExternalWorkImpactRowV1 } from "./external-work-impact-v1";
import type { SessionMeaningActionTrigger } from "./session-meaning";
import {
  projectSuggestedActionsFromDraftSummary,
  type SessionMeaningSuggestedActions,
} from "./session-meaning-suggested-actions";
import {
  buildParentActionsFromNextActionsSnapshot,
  type LiveTrainingParentMeaningActionRow,
} from "./parent-actions-from-session-meaning";

const MODE_LABEL_RU: Record<string, string> = {
  ice: "Ледовая тренировка",
  ofp: "ОФП",
  mixed: "Смешанный формат",
};

const MAX_PARENT_HIGHLIGHTS = 8;
const MAX_PARENT_DEVELOPMENT = 6;
const MAX_PARENT_PLAYER_HIGHLIGHTS = 5;
const MAX_PARENT_SUPPORT = 8;
const MAX_SCHOOL_MONITORING = 12;
const MAX_COACH_REMINDERS = 4;

export type LiveTrainingCoachView = {
  sessionMeta: LiveTrainingSessionReportDraftSummary["sessionMeta"];
  counters: LiveTrainingSessionReportDraftSummary["counters"];
  focusDomains: string[];
  players: LiveTrainingSessionReportDraftSummary["players"];
  notes: LiveTrainingSessionReportDraftSummary["notes"];
  /** Операционные напоминания (проверки, исключения) — только для тренера. */
  internalReminders: string[];
  /** Канонический текстовый черновик (только coach tab). */
  coachPreviewNarrativeV1?: LiveTrainingSessionReportDraftSummary["coachPreviewNarrativeV1"];
  /** PHASE 6 Step 12: следующие шаги из SessionMeaning. */
  nextActions?: LiveTrainingSessionReportDraftSummary["sessionMeaningNextActionsV1"];
  /** PHASE 6 Step 15 */
  sessionProgress?: LiveTrainingSessionReportDraftSummary["sessionMeaningProgressV1"];
  /** PHASE 6 Step 16: все типы триггеров — только для тренера. */
  arenaRecommendations?: SessionMeaningActionTrigger[];
  /** PHASE 6 Step 17: предлагаемые действия (проекция из actionTriggers, см. summary). */
  suggestedActions?: SessionMeaningSuggestedActions;
  /** STEP 24 */
  externalWorkImpactV1?: ExternalWorkImpactRowV1[];
};

export type LiveTrainingParentSessionMetaSoft = {
  teamLabel: string;
  modeLabel: string;
  dateLabel: string;
};

export type LiveTrainingParentPlayerHighlight = {
  playerName: string;
  playerId?: string;
  summaryLine: string;
};

export type LiveTrainingParentView = {
  sessionMeta: LiveTrainingParentSessionMetaSoft;
  /** 1–3 нейтральные фактуальные строки без внутренней терминологии. */
  overviewLines: string[];
  highlights: string[];
  developmentFocus: string[];
  playerHighlights: LiveTrainingParentPlayerHighlight[];
  supportNotes: string[];
  /** PHASE 6 Step 14: что родитель может сделать дома (из SessionMeaning / nextActions). */
  parentActions?: LiveTrainingParentMeaningActionRow[];
  /** PHASE 6 Step 15: одна строка о динамике vs прошлая тренировка. */
  progressHeadlineRu?: string;
  /** PHASE 6 Step 16: только progress_high (безопасный контент). */
  arenaSafeRecommendations?: SessionMeaningActionTrigger[];
  /** PHASE 6 Step 17: безопасные suggested actions (только progress_high). */
  suggestedParentActions?: SessionMeaningSuggestedActions["parent"];
};

export type LiveTrainingSchoolPlayerInFocus = {
  playerId: string;
  playerName: string;
  totalSignals: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  topDomains: string[];
};

export type LiveTrainingSchoolView = {
  sessionMeta: LiveTrainingSessionReportDraftSummary["sessionMeta"];
  teamSummaryLines: string[];
  focusDomains: string[];
  playersInFocus: LiveTrainingSchoolPlayerInFocus[];
  counters: LiveTrainingSessionReportDraftSummary["counters"];
  monitoringNotes: string[];
};

export type LiveTrainingReportAudienceViews = {
  coachView: LiveTrainingCoachView;
  parentView: LiveTrainingParentView;
  schoolView: LiveTrainingSchoolView;
};

function formatDateRu(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function softLineFromPositiveNote(text: string, playerName?: string): string {
  const t = text.trim();
  if (!t) return "";
  if (playerName && playerName !== "—") {
    return `${playerName}: ${t}`;
  }
  return t;
}

function softLineFromAttention(text: string, playerName?: string): string {
  const t = text.trim();
  if (!t) return "";
  if (playerName && playerName !== "Без привязки к игроку") {
    return `${playerName}: ${t}`;
  }
  return t;
}

import { buildParentProgressHeadlineRu } from "@shared/live-training/parent-progress-headline-ru";
export { buildParentProgressHeadlineRu };

/**
 * Строит три structured projection из уже сохранённого summary (без новых запросов к БД).
 */
export function buildLiveTrainingReportAudienceViews(
  summary: LiveTrainingSessionReportDraftSummary
): LiveTrainingReportAudienceViews {
  const { sessionMeta, counters, focusDomains, players, notes } = summary;

  const internalReminders: string[] = [];
  if (counters.draftsFlaggedNeedsReview > 0) {
    internalReminders.push(
      `При фиксации отмечены наблюдения, которые тренер пометил для дополнительной проверки (${counters.draftsFlaggedNeedsReview}).`
    );
  }
  if (counters.excludedDraftsCount > 0) {
    internalReminders.push(
      `Исключено из итоговой выгрузки наблюдений: ${counters.excludedDraftsCount} (не учитываются в сигналах и отчёте).`
    );
  }
  if (counters.signalsCreatedCount === 0 && counters.includedDraftsCount > 0) {
    internalReminders.push(
      "Сигналы не сформированы: часть наблюдений могла быть без привязки к игроку."
    );
  }
  if (internalReminders.length > MAX_COACH_REMINDERS) {
    internalReminders.length = MAX_COACH_REMINDERS;
  }

  const actionTriggersAll = summary.sessionMeaningActionTriggersV1 ?? [];
  const actionTriggersSafe = actionTriggersAll
    .filter((t) => t.type === "progress_high")
    .map((t) => ({ ...t }));

  /** Read path: не вызывать buildSuggestedActionsFromSessionMeaning — только проекция из summary. */
  const suggestedFromSummary = projectSuggestedActionsFromDraftSummary(summary);

  const coachView: LiveTrainingCoachView = {
    sessionMeta: { ...sessionMeta },
    counters: { ...counters },
    focusDomains: [...focusDomains],
    players: players.map((p) => ({ ...p, evidence: p.evidence.map((e) => ({ ...e })) })),
    notes: {
      needsAttention: notes.needsAttention.map((n) => ({ ...n })),
      positives: notes.positives.map((n) => ({ ...n })),
    },
    internalReminders,
    ...(summary.coachPreviewNarrativeV1
      ? {
          coachPreviewNarrativeV1: {
            sessionSummaryLines: [...summary.coachPreviewNarrativeV1.sessionSummaryLines],
            focusAreas: [...summary.coachPreviewNarrativeV1.focusAreas],
            playerHighlights: summary.coachPreviewNarrativeV1.playerHighlights.map((h) => ({ ...h })),
          },
        }
      : {}),
    ...(summary.sessionMeaningNextActionsV1
      ? {
          nextActions: {
            team: [...summary.sessionMeaningNextActionsV1.team],
            nextTrainingFocus: [...summary.sessionMeaningNextActionsV1.nextTrainingFocus],
            players: summary.sessionMeaningNextActionsV1.players.map((p) => ({
              ...p,
              actions: [...p.actions],
            })),
          },
        }
      : {}),
    ...(summary.sessionMeaningProgressV1 &&
    (summary.sessionMeaningProgressV1.team.length > 0 ||
      summary.sessionMeaningProgressV1.players.length > 0)
      ? {
          sessionProgress: {
            team: [...summary.sessionMeaningProgressV1.team],
            players: summary.sessionMeaningProgressV1.players.map((p) => ({ ...p })),
          },
        }
      : {}),
    ...(actionTriggersAll.length > 0
      ? { arenaRecommendations: actionTriggersAll.map((t) => ({ ...t })) }
      : {}),
    ...(suggestedFromSummary.coach.length > 0
      ? {
          suggestedActions: {
            coach: suggestedFromSummary.coach.map((c) => ({ ...c })),
            parent: suggestedFromSummary.parent.map((p) => ({ ...p })),
          },
        }
      : {}),
    ...(summary.externalWorkImpactV1 && summary.externalWorkImpactV1.length > 0
      ? {
          externalWorkImpactV1: summary.externalWorkImpactV1.map((r) => ({ ...r })),
        }
      : {}),
  };

  const modeLabel = MODE_LABEL_RU[sessionMeta.mode] ?? sessionMeta.mode;
  const progressHeadlineRu = buildParentProgressHeadlineRu(summary.sessionMeaningProgressV1);
  const parentSessionMeta: LiveTrainingParentSessionMetaSoft = {
    teamLabel: sessionMeta.teamName,
    modeLabel,
    dateLabel: formatDateRu(sessionMeta.startedAt),
  };

  const overviewLines: string[] = [];
  if (counters.signalsCreatedCount > 0) {
    overviewLines.push(
      `На тренировке зафиксированы персональные отметки по ${counters.affectedPlayersCount} игрокам команды.`
    );
  } else if (counters.includedDraftsCount > 0) {
    overviewLines.push("Тренировка зафиксирована; персональные отметки по игрокам в этой выгрузке отсутствуют.");
  } else {
    overviewLines.push("Краткая фиксация тренировки без детальных наблюдений в этой сессии.");
  }
  if (overviewLines.length < 2 && focusDomains.length > 0) {
    overviewLines.push("Акцент тренировки связан с ключевыми темами, отражёнными в отметках тренера.");
  }
  overviewLines.splice(3);

  const highlights: string[] = [];
  for (const n of notes.positives) {
    const line = softLineFromPositiveNote(n.text, n.playerName);
    if (line && highlights.length < MAX_PARENT_HIGHLIGHTS) highlights.push(line);
  }
  for (const p of players) {
    if (highlights.length >= MAX_PARENT_HIGHLIGHTS) break;
    for (const ev of p.evidence) {
      if (ev.direction !== "positive") continue;
      const line = softLineFromPositiveNote(ev.text, p.playerName);
      if (line && !highlights.includes(line)) highlights.push(line);
      if (highlights.length >= MAX_PARENT_HIGHLIGHTS) break;
    }
  }

  const developmentFocus: string[] = [];
  for (const p of players) {
    if (developmentFocus.length >= MAX_PARENT_DEVELOPMENT) break;
    for (const ev of p.evidence) {
      if (ev.direction !== "negative") continue;
      const line = softLineFromAttention(ev.text, p.playerName);
      if (line && !developmentFocus.includes(line)) developmentFocus.push(line);
      if (developmentFocus.length >= MAX_PARENT_DEVELOPMENT) break;
    }
  }
  for (const n of notes.needsAttention) {
    const line = softLineFromAttention(n.text, n.playerName);
    if (line && !developmentFocus.includes(line) && developmentFocus.length < MAX_PARENT_DEVELOPMENT) {
      developmentFocus.push(line);
    }
  }

  const supportNotes: string[] = [];
  for (const n of notes.needsAttention) {
    const line = softLineFromAttention(n.text, n.playerName);
    if (line && supportNotes.length < MAX_PARENT_SUPPORT && !supportNotes.includes(line)) {
      supportNotes.push(line);
    }
  }

  const playerHighlights: LiveTrainingParentPlayerHighlight[] = [];
  for (const p of players) {
    if (playerHighlights.length >= MAX_PARENT_PLAYER_HIGHLIGHTS) break;
    const posEv = p.evidence.find((e) => e.direction === "positive");
    const anyEv = p.evidence[0];
    let summaryLine = "";
    if (posEv) {
      summaryLine = posEv.text.trim();
    } else if (p.positiveCount > 0) {
      summaryLine = "Есть отметки с положительным акцентом по итогам тренировки.";
    } else if (anyEv) {
      summaryLine = anyEv.text.trim();
    } else if (p.totalSignals > 0) {
      summaryLine = "Участвовал в наблюдениях тренера на этой тренировке.";
    } else {
      continue;
    }
    playerHighlights.push({
      playerName: p.playerName,
      playerId: p.playerId,
      summaryLine: truncateSoft(summaryLine, 160),
    });
  }

  const persistedParent = summary.sessionMeaningParentActionsV1;
  const derivedParent =
    persistedParent && persistedParent.length > 0
      ? persistedParent.map((r) => ({
          playerId: r.playerId,
          playerName: r.playerName,
          actions: [...r.actions],
        }))
      : buildParentActionsFromNextActionsSnapshot(summary.sessionMeaningNextActionsV1);

  const parentView: LiveTrainingParentView = {
    sessionMeta: parentSessionMeta,
    overviewLines,
    highlights,
    developmentFocus,
    playerHighlights,
    supportNotes,
    ...(derivedParent.length > 0
      ? {
          parentActions: derivedParent.map((r) => ({
            playerId: r.playerId,
            playerName: r.playerName,
            actions: [...r.actions],
          })),
        }
      : {}),
    ...(progressHeadlineRu ? { progressHeadlineRu } : {}),
    ...(actionTriggersSafe.length > 0
      ? { arenaSafeRecommendations: actionTriggersSafe }
      : {}),
    ...(suggestedFromSummary.parent.length > 0
      ? { suggestedParentActions: suggestedFromSummary.parent.map((p) => ({ ...p })) }
      : {}),
  };

  const teamSummaryLines: string[] = [];
  teamSummaryLines.push(
    `Команда: ${sessionMeta.teamName}. Формат: ${modeLabel}. Дата: ${formatDateRu(sessionMeta.startedAt)}.`
  );
  if (counters.signalsCreatedCount > 0) {
    teamSummaryLines.push(
      `Сформировано сигналов: ${counters.signalsCreatedCount}; игроков в фокусе: ${counters.affectedPlayersCount}.`
    );
  } else {
    teamSummaryLines.push("Персональные сигналы по игрокам в этой сессии отсутствуют.");
  }
  teamSummaryLines.push(
    `Тональность сигналов: положительные ${counters.positiveSignalsCount}, внимание ${counters.negativeSignalsCount}, нейтральные ${counters.neutralSignalsCount}.`
  );

  const playersInFocus: LiveTrainingSchoolPlayerInFocus[] = players.slice(0, 10).map((p) => ({
    playerId: p.playerId,
    playerName: p.playerName,
    totalSignals: p.totalSignals,
    positiveCount: p.positiveCount,
    negativeCount: p.negativeCount,
    neutralCount: p.neutralCount,
    topDomains: [...p.topDomains],
  }));

  const monitoringNotes: string[] = [];
  for (const n of notes.needsAttention) {
    const who = n.playerName ? `${n.playerName}: ` : "";
    const line = `${who}${n.text}`.trim();
    if (line && monitoringNotes.length < MAX_SCHOOL_MONITORING) monitoringNotes.push(line);
  }
  if (counters.draftsFlaggedNeedsReview > 0) {
    monitoringNotes.push(
      `Контроль: ${counters.draftsFlaggedNeedsReview} наблюдений с внутренней пометкой проверки при фиксации.`
    );
  }
  if (counters.excludedDraftsCount > 0) {
    monitoringNotes.push(`Учёт: исключено наблюдений из отчётной выгрузки — ${counters.excludedDraftsCount}.`);
  }
  if (monitoringNotes.length > MAX_SCHOOL_MONITORING) {
    monitoringNotes.length = MAX_SCHOOL_MONITORING;
  }

  const schoolView: LiveTrainingSchoolView = {
    sessionMeta: { ...sessionMeta },
    teamSummaryLines,
    focusDomains: [...focusDomains],
    playersInFocus,
    counters: { ...counters },
    monitoringNotes,
  };

  return { coachView, parentView, schoolView };
}

function truncateSoft(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
