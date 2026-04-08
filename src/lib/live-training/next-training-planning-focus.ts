/**
 * PHASE 17: лёгкий read-model «фокус на следующую тренировку» из follow-ups и недавних live signals.
 */

import { prisma } from "@/lib/prisma";
import {
  buildTrainingPlanSeedsFromPlanning,
  type TrainingPlanSeedsResultDto,
} from "./build-training-plan-seeds-from-focus";
import {
  fetchRecentConfirmedLiveTrainingContinuitySnapshots,
  RECENT_CONTINUITY_HISTORY_LIMIT,
} from "./live-training-continuity-lock-in";
import {
  buildLiveTrainingCarryForward,
  type LiveTrainingCarryForwardDto,
} from "./live-training-carry-forward";
import {
  buildNextTrainingStartPriorities,
  type NextTrainingStartPrioritiesDto,
} from "./next-training-start-priorities";
import {
  applyExecutionPressureToAdaptive,
  computeLiveTrainingAdaptivePlanningSignals,
  type AlignmentExecutionMode,
} from "./liveTrainingAdaptivePlanning";
import {
  buildLiveTrainingCoachIntelligence,
  type LiveTrainingCoachIntelligenceDto,
} from "./liveTrainingCoachIntelligence";
import { liveTrainingMetricDomainLabelRu } from "./player-live-training-signals-labels";
import { buildLiveTrainingSessionOutcomeForSession } from "./live-training-session-outcome";
import {
  buildLiveTrainingCarryForwardSeedDto,
  type LiveTrainingCarryForwardSeedDto,
} from "./finalize-carry-forward-seed";
import { parsePlanningSnapshotFromDb } from "./live-training-planning-snapshot";
import {
  buildCoachCrossSessionContinuitySummary,
  type CoachCrossSessionContinuitySummaryDto,
} from "./cross-session-continuity-summary";

function manualAttentionWordRu(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "позиция";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return "позиции";
  return "позиций";
}

export type { LiveTrainingCarryForwardDto };

const SIGNAL_LOOKBACK_DAYS = 21;
const MAX_SIGNALS = 120;
const MAX_FOCUS_PLAYERS = 5;
const MAX_FOCUS_DOMAINS = 3;
const MAX_REINFORCE = 2;
const MAX_SUMMARY_LINES = 3;
const MAX_REASONS_PER_PLAYER = 3;
const NEG_DOMAIN_REPEAT_MIN = 2;
const POS_DOMAIN_REPEAT_MIN = 3;

export type NextTrainingPlanningPlayerFocus = {
  playerId: string;
  playerName: string;
  reasons: string[];
  priority: "high" | "medium" | "low";
};

export type NextTrainingPlanningDomainFocus = {
  domain: string;
  labelRu: string;
  reason: string;
  priority: "high" | "medium" | "low";
};

export type NextTrainingPlanningReinforce = {
  domain: string;
  labelRu: string;
  reason: string;
};

export type NextTrainingPlanningFocusDto = {
  teamId: string;
  focusPlayers: NextTrainingPlanningPlayerFocus[];
  focusDomains: NextTrainingPlanningDomainFocus[];
  reinforceAreas: NextTrainingPlanningReinforce[];
  summaryLines: string[];
  lowData: boolean;
  planSeeds: TrainingPlanSeedsResultDto;
  /** PHASE 28: continuity from previous cycle; null when nothing to carry */
  carryForward: LiveTrainingCarryForwardDto | null;
  /** PHASE 41: приоритизация старта (follow-up > lock-in > wrap/planning) */
  startPriorities: NextTrainingStartPrioritiesDto;
  /** PHASE 46: адаптация от priorityAlignmentReview последней подтверждённой сессии (additive). */
  priorAlignmentAdaptive?: {
    executionMode: AlignmentExecutionMode;
  };
  /** PHASE 47: паттерны по недавним continuity (опционально для клиента). */
  coachIntelligence?: LiveTrainingCoachIntelligenceDto;
  /**
   * PHASE 49: короткие подсказки с последней подтверждённой сессии (пятёрка / итог сессии / ручная проверка).
   * Закрывает closed loop complete → start без дублирования полного handoff.
   */
  lastSessionHandoffHints: string[];
  /** Ориентиры из отчётного слоя planning snapshot последней подтверждённой сессии (рекомпозиция). */
  carryForwardSeed: LiveTrainingCarryForwardSeedDto | null;
  /** Компактная сводка непрерывности (не источник истины). */
  continuitySummary: CoachCrossSessionContinuitySummaryDto | null;
};

const PR_RANK = { high: 3, medium: 2, low: 1 } as const;

function rankFromActionCandidateId(candidateId: string): "high" | "medium" | "low" {
  if (
    candidateId.includes(":monitor_attention") ||
    candidateId.includes(":monitor_effort") ||
    candidateId.includes(":monitor_technique") ||
    candidateId.endsWith(":focus_next") ||
    candidateId.endsWith(":review")
  ) {
    return "high";
  }
  if (candidateId.includes(":follow_up_check")) {
    return "medium";
  }
  if (candidateId.includes(":reinforce")) {
    return "low";
  }
  return "medium";
}

/** playerId из ltac:p:PLAYER:... или ltac:s:SID:p:PLAYER:... */
export function playerIdFromLiveTrainingCandidateId(candidateId: string): string | null {
  const parts = candidateId.split(":");
  if (parts[0] !== "ltac") return null;
  if (parts[1] === "p" && parts.length >= 4) return parts[2] ?? null;
  if (parts[1] === "s" && parts[3] === "p" && parts.length >= 5) return parts[4] ?? null;
  return null;
}

function extractDomainsFromActionDescription(description: string): string[] {
  const m = description.match(/Темы \(домены\):\s*([^\n]+)/);
  if (!m?.[1]) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function maxPriority(
  a: "high" | "medium" | "low",
  b: "high" | "medium" | "low"
): "high" | "medium" | "low" {
  return PR_RANK[a] >= PR_RANK[b] ? a : b;
}

export async function getNextTrainingPlanningFocus(
  coachId: string,
  teamId: string
): Promise<NextTrainingPlanningFocusDto> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - SIGNAL_LOOKBACK_DAYS);

  const playerRows = await prisma.player.findMany({
    where: { teamId },
    select: { id: true, firstName: true, lastName: true },
  });

  const empty = (): NextTrainingPlanningFocusDto => {
    const focusPlayers: NextTrainingPlanningPlayerFocus[] = [];
    const focusDomains: NextTrainingPlanningDomainFocus[] = [];
    const reinforceAreas: NextTrainingPlanningReinforce[] = [];
    const lowData = true;
    return {
      teamId,
      focusPlayers,
      focusDomains,
      reinforceAreas,
      summaryLines: [],
      lowData,
      planSeeds: buildTrainingPlanSeedsFromPlanning(
        {
          focusPlayers,
          focusDomains,
          reinforceAreas,
          lowData,
        },
        null
      ),
      carryForward: null,
      startPriorities: {
        primaryPlayers: [],
        primaryDomains: [],
        secondaryItems: [],
        reinforcementItems: [],
        lowData: true,
      },
      priorAlignmentAdaptive: { executionMode: "stable" },
      coachIntelligence: {
        signals: [],
        summaryLines: [],
        executionPressureMode: "normal",
      },
      lastSessionHandoffHints: [],
      carryForwardSeed: null,
      continuitySummary: null,
    };
  };

  if (playerRows.length === 0) {
    return empty();
  }

  const playerIdSet = new Set(playerRows.map((p) => p.id));
  const teamPlayerIds = [...playerIdSet];
  const nameById = new Map(
    playerRows.map((p) => [
      p.id,
      [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "Игрок",
    ])
  );

  const [actionRows, signals] = await Promise.all([
    prisma.actionItem.findMany({
      where: {
        coachId,
        playerId: { in: teamPlayerIds },
        liveTrainingCandidateId: { not: null },
        status: "open",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        description: true,
        liveTrainingCandidateId: true,
        playerId: true,
        createdAt: true,
      },
    }),
    prisma.liveTrainingPlayerSignal.findMany({
      where: {
        teamId,
        coachId,
        createdAt: { gte: since },
        LiveTrainingSession: { status: "confirmed" },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_SIGNALS,
      select: {
        playerId: true,
        metricDomain: true,
        signalDirection: true,
      },
    }),
  ]);

  const actionRowsScoped = actionRows.filter(
    (r) => r.playerId && playerIdSet.has(r.playerId) && r.liveTrainingCandidateId
  );

  type PlayerAgg = {
    reasons: string[];
    priority: "high" | "medium" | "low";
    lastAt: Date;
  };
  const byPlayer = new Map<string, PlayerAgg>();

  for (const row of actionRowsScoped) {
    const cid = row.liveTrainingCandidateId!;
    const pid = row.playerId!;
    const inferredPid = playerIdFromLiveTrainingCandidateId(cid);
    if (inferredPid && inferredPid !== pid) continue;

    const pr = rankFromActionCandidateId(cid);
    const title = row.title.trim();
    const cur = byPlayer.get(pid);
    const reason = title.length > 0 ? title : "Follow-up из live training";
    if (!cur) {
      byPlayer.set(pid, { reasons: [reason], priority: pr, lastAt: row.createdAt });
    } else {
      cur.priority = maxPriority(cur.priority, pr);
      if (row.createdAt > cur.lastAt) cur.lastAt = row.createdAt;
      if (!cur.reasons.includes(reason) && cur.reasons.length < MAX_REASONS_PER_PLAYER) {
        cur.reasons.push(reason);
      }
    }
  }

  const negByDomain = new Map<string, number>();
  const posByDomain = new Map<string, number>();
  const negByPlayer = new Map<string, number>();

  for (const s of signals) {
    if (s.signalDirection === "negative") {
      negByDomain.set(s.metricDomain, (negByDomain.get(s.metricDomain) ?? 0) + 1);
      negByPlayer.set(s.playerId, (negByPlayer.get(s.playerId) ?? 0) + 1);
    } else if (s.signalDirection === "positive") {
      posByDomain.set(s.metricDomain, (posByDomain.get(s.metricDomain) ?? 0) + 1);
    }
  }

  for (const [pid, n] of negByPlayer.entries()) {
    if (n < NEG_DOMAIN_REPEAT_MIN || !playerIdSet.has(pid)) continue;
    if (byPlayer.has(pid)) continue;
    byPlayer.set(pid, {
      reasons: [`Недавние сигналы «внимание» по игроку (${n} в окне ${SIGNAL_LOOKBACK_DAYS} дн.)`],
      priority: n >= 4 ? "high" : "medium",
      lastAt: new Date(),
    });
  }

  const focusPlayers: NextTrainingPlanningPlayerFocus[] = [...byPlayer.entries()]
    .sort((a, b) => {
      const pr = PR_RANK[b[1].priority] - PR_RANK[a[1].priority];
      if (pr !== 0) return pr;
      return b[1].lastAt.getTime() - a[1].lastAt.getTime();
    })
    .slice(0, MAX_FOCUS_PLAYERS)
    .map(([playerId, agg]) => ({
      playerId,
      playerName: nameById.get(playerId) ?? "Игрок",
      reasons: agg.reasons.slice(0, MAX_REASONS_PER_PLAYER),
      priority: agg.priority,
    }));

  const domainAgg = new Map<
    string,
    { score: number; reasons: string[]; priority: "high" | "medium" | "low" }
  >();

  for (const row of actionRowsScoped) {
    const cid = row.liveTrainingCandidateId!;
    const doms = extractDomainsFromActionDescription(row.description);
    const pr = rankFromActionCandidateId(cid);
    for (const d of doms) {
      if (!d) continue;
      const cur = domainAgg.get(d) ?? { score: 0, reasons: [], priority: "low" };
      cur.score += 2;
      cur.priority = maxPriority(cur.priority, pr);
      const line = `Follow-up: ${row.title.trim().slice(0, 80)}`;
      if (!cur.reasons.includes(line) && cur.reasons.length < 2) cur.reasons.push(line);
      domainAgg.set(d, cur);
    }
  }

  for (const [domain, c] of negByDomain.entries()) {
    if (c < NEG_DOMAIN_REPEAT_MIN) continue;
    const cur = domainAgg.get(domain) ?? { score: 0, reasons: [], priority: "medium" };
    cur.score += c;
    cur.priority = maxPriority(cur.priority, c >= 4 ? "high" : "medium");
    const line = `Повторяющиеся отметки «внимание» в данных live training (${c})`;
    if (!cur.reasons.includes(line)) cur.reasons.push(line);
    domainAgg.set(domain, cur);
  }

  const reinforceDomains = new Map<string, { score: number; reasons: string[] }>();

  for (const row of actionRowsScoped) {
    const cid = row.liveTrainingCandidateId!;
    if (!cid.includes("reinforce")) continue;
    for (const d of extractDomainsFromActionDescription(row.description)) {
      const cur = reinforceDomains.get(d) ?? { score: 0, reasons: [] };
      cur.score += 2;
      const line = `Задача на закрепление: ${row.title.trim().slice(0, 72)}`;
      if (!cur.reasons.includes(line) && cur.reasons.length < 2) cur.reasons.push(line);
      reinforceDomains.set(d, cur);
    }
  }

  for (const [domain, c] of posByDomain.entries()) {
    if (c < POS_DOMAIN_REPEAT_MIN) continue;
    const cur = reinforceDomains.get(domain) ?? { score: 0, reasons: [] };
    cur.score += c;
    const line = `Устойчивый позитив в сигналах (${c} за ${SIGNAL_LOOKBACK_DAYS} дн.)`;
    if (!cur.reasons.includes(line)) cur.reasons.push(line);
    reinforceDomains.set(domain, cur);
  }

  const focusDomainKeys = [...domainAgg.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, MAX_FOCUS_DOMAINS)
    .map(([k]) => k);

  const focusDomains: NextTrainingPlanningDomainFocus[] = focusDomainKeys.map((domain) => {
    const pack = domainAgg.get(domain)!;
    return {
      domain,
      labelRu: liveTrainingMetricDomainLabelRu(domain),
      reason: pack.reasons[0] ?? "Тема отмечена в недавних данных live training.",
      priority: pack.priority,
    };
  });

  const reinforceKeys = [...reinforceDomains.entries()]
    .filter(([d]) => !focusDomainKeys.includes(d))
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, MAX_REINFORCE)
    .map(([k]) => k);

  const reinforceAreas: NextTrainingPlanningReinforce[] = reinforceKeys.map((domain) => {
    const pack = reinforceDomains.get(domain)!;
    return {
      domain,
      labelRu: liveTrainingMetricDomainLabelRu(domain),
      reason: pack.reasons[0] ?? "Позитивная динамика в недавних сигналах.",
    };
  });

  const summaryLines: string[] = [];
  if (focusPlayers.length > 0) {
    const shortNames = focusPlayers
      .slice(0, 3)
      .map((p) => p.playerName.split(/\s+/)[0] || p.playerName)
      .join(", ");
    summaryLines.push(`Сегодня держим в фокусе: ${shortNames}.`);
  }
  if (focusDomains.length > 0) {
    summaryLines.push(
      `Повторно проверяем темы: ${focusDomains.map((d) => d.labelRu).join(", ")}.`
    );
  }
  if (reinforceAreas.length > 0) {
    summaryLines.push(`Закрепляем: ${reinforceAreas.map((r) => r.labelRu).join(", ")}.`);
  }

  const trimmedSummary = summaryLines.slice(0, MAX_SUMMARY_LINES);
  const hasBody =
    focusPlayers.length > 0 || focusDomains.length > 0 || reinforceAreas.length > 0;
  const hasMaterializedFollowUps = actionRowsScoped.length > 0;
  const lowData = !hasBody || (hasBody && !hasMaterializedFollowUps);

  const recentContinuity = await fetchRecentConfirmedLiveTrainingContinuitySnapshots(
    teamId,
    coachId,
    RECENT_CONTINUITY_HISTORY_LIMIT
  );
  const lockInSnapshot = recentContinuity[0] ?? null;

  const lastSessionHandoffHints: string[] = [];
  const lastConfirmedSession = await prisma.liveTrainingSession.findFirst({
    where: { teamId, coachId, status: "confirmed" },
    orderBy: { confirmedAt: "desc" },
    select: { id: true, planningSnapshotJson: true },
  });

  let carryForwardSeed: LiveTrainingCarryForwardSeedDto | null = null;
  if (lastConfirmedSession) {
    try {
      const lastOutcome = await buildLiveTrainingSessionOutcomeForSession(lastConfirmedSession.id);
      if (lastOutcome.teamObservationCount > 0) {
        lastSessionHandoffHints.push(
          `Пятёрка: в прошлой фиксации ${lastOutcome.teamObservationCount} наблюдений — сохрани групповой акцент.`
        );
      }
      if (lastOutcome.sessionObservationCount > 0) {
        lastSessionHandoffHints.push(
          `Итог сессии: ${lastOutcome.sessionObservationCount} записей с прошлого занятия.`
        );
      }
      if (lastOutcome.manualAttentionDraftsCount > 0) {
        const n = lastOutcome.manualAttentionDraftsCount;
        lastSessionHandoffHints.push(
          `Не закрыто вручную с прошлого старта: ${n} ${manualAttentionWordRu(n)}.`
        );
      }
    } catch {
      /* не блокируем старт планирования */
    }
    try {
      const parsed = parsePlanningSnapshotFromDb(lastConfirmedSession.planningSnapshotJson);
      carryForwardSeed = buildLiveTrainingCarryForwardSeedDto(parsed, lastConfirmedSession.id);
    } catch {
      carryForwardSeed = null;
    }
  }

  const coachIntelligence = buildLiveTrainingCoachIntelligence({
    recentContinuitySnapshots: recentContinuity,
    nameById,
  });

  let adaptivePlanning = computeLiveTrainingAdaptivePlanningSignals(lockInSnapshot);
  adaptivePlanning = applyExecutionPressureToAdaptive(
    adaptivePlanning,
    coachIntelligence.executionPressureMode
  );

  const carryForward = await buildLiveTrainingCarryForward({
    teamId,
    coachId,
    actionRowsScoped: actionRowsScoped.map((r) => ({
      title: r.title,
      description: r.description,
      liveTrainingCandidateId: r.liveTrainingCandidateId!,
      playerId: r.playerId,
      createdAt: r.createdAt,
    })),
    nameById,
    domainAgg,
    planning: {
      focusPlayers,
      focusDomains,
      reinforceAreas,
    },
    lockInSnapshot,
  });

  const startPriorities = buildNextTrainingStartPriorities({
    carryForward,
    planning: { focusPlayers, focusDomains, reinforceAreas },
    planningLowData: lowData,
    adaptivePlanning,
  });

  const summaryChunks: string[] = [];
  if (adaptivePlanning.adaptiveSummaryHint != null) {
    summaryChunks.push(adaptivePlanning.adaptiveSummaryHint);
  }
  if (coachIntelligence.summaryLines[0]) {
    summaryChunks.push(coachIntelligence.summaryLines[0]);
  }
  summaryChunks.push(...trimmedSummary);
  const summaryLinesWithAdaptive = summaryChunks.slice(0, MAX_SUMMARY_LINES);

  const handoffHintsTrimmed = lastSessionHandoffHints.slice(0, 4);
  const continuitySummary = buildCoachCrossSessionContinuitySummary({
    lowData,
    carryForwardSeed,
    carryForward,
    startPriorities,
    lastSessionHandoffHints: handoffHintsTrimmed,
    coachIntelligence,
    planningFocusDomains: focusDomains.map((d) => ({ labelRu: d.labelRu })),
  });

  return {
    teamId,
    focusPlayers,
    focusDomains,
    reinforceAreas,
    summaryLines: summaryLinesWithAdaptive,
    lowData,
    planSeeds: buildTrainingPlanSeedsFromPlanning(
      {
        focusPlayers,
        focusDomains,
        reinforceAreas,
        lowData,
      },
      carryForward,
      adaptivePlanning
    ),
    carryForward,
    startPriorities,
    priorAlignmentAdaptive: {
      executionMode: adaptivePlanning.alignmentExecutionMode,
    },
    coachIntelligence,
    lastSessionHandoffHints: handoffHintsTrimmed,
    carryForwardSeed,
    continuitySummary,
  };
}
