/**
 * PHASE 40: явный continuity lock-in после confirm (компактный мост в следующий старт, без LLM).
 */

import { prisma } from "@/lib/prisma";
import type { LiveTrainingSessionOutcomeDto } from "./live-training-session-outcome";
import type { LiveTrainingPriorityAlignmentReviewDto } from "./liveTrainingPriorityReviewScorer";
import type { LiveTrainingQualityFrameDto } from "./liveTrainingQualityFrame";
import { liveTrainingMetricDomainLabelRu } from "./player-live-training-signals-labels";

export const LIVE_TRAINING_CONTINUITY_SNAPSHOT_VERSION = 1 as const;

export type LiveTrainingContinuityLockInPlayer = {
  playerId: string;
  playerName: string;
  reason: string;
};

export type LiveTrainingContinuityLockInDomain = {
  domain: string;
  labelRu: string;
  reason: string;
  /** Источник для отладки / carry-forward */
  source: string;
};

export type LiveTrainingContinuityLockInReinforce = {
  domain: string;
  labelRu: string;
  reason: string;
};

/** Persisted JSON shape (1:1 с continuitySnapshotJson на сессии). */
export type LiveTrainingContinuitySnapshotDto = {
  version: typeof LIVE_TRAINING_CONTINUITY_SNAPSHOT_VERSION;
  generatedAt: string;
  teamId: string;
  carriedFocusPlayers: LiveTrainingContinuityLockInPlayer[];
  carriedDomains: LiveTrainingContinuityLockInDomain[];
  carriedReinforceAreas: LiveTrainingContinuityLockInReinforce[];
  summaryLines: string[];
  /** PHASE 44: additive — оценка закрытия start priorities по сигналам */
  priorityAlignmentReview?: LiveTrainingPriorityAlignmentReviewDto;
  /** PHASE 48: агрегированный кадр качества (для complete / CRM / аналитики) */
  trainingQualityFrame?: LiveTrainingQualityFrameDto;
};

const MAX_PLAYERS = 4;
const MAX_DOMAINS = 3;
const MAX_REINFORCE = 2;

function firstNameOnly(name: string): string {
  const t = name.trim();
  if (!t) return "Игрок";
  return t.split(/\s+/)[0] ?? t;
}

/**
 * Rule-based снимок из outcome подтверждённой сессии (игроки / домены / закрепление / 2–3 строки).
 */
export function buildLiveTrainingContinuityLockIn(params: {
  teamId: string;
  generatedAt: Date;
  outcome: LiveTrainingSessionOutcomeDto;
}): LiveTrainingContinuitySnapshotDto {
  const { teamId, generatedAt, outcome } = params;

  const carriedFocusPlayers: LiveTrainingContinuityLockInPlayer[] = outcome.topPlayers
    .slice(0, MAX_PLAYERS)
    .map((p) => ({
      playerId: p.playerId,
      playerName: p.playerName,
      reason: `${p.totalSignals} сигн. в этой тренировке (плюс ${p.positiveCount}, внимание ${p.negativeCount}).`,
    }));

  const carriedDomains: LiveTrainingContinuityLockInDomain[] = outcome.topDomains
    .slice(0, MAX_DOMAINS)
    .map((domain) => ({
      domain,
      labelRu: liveTrainingMetricDomainLabelRu(domain),
      reason: "Чаще других встречалось в сигналах этой сессии.",
      source: "session_outcome",
    }));

  const carriedReinforceAreas: LiveTrainingContinuityLockInReinforce[] = [];
  const seenReinforce = new Set<string>();
  for (const p of outcome.topPlayers) {
    if (carriedReinforceAreas.length >= MAX_REINFORCE) break;
    if (p.negativeCount <= p.positiveCount) continue;
    for (const d of p.topDomains) {
      if (carriedReinforceAreas.length >= MAX_REINFORCE) break;
      if (!d || seenReinforce.has(d)) continue;
      seenReinforce.add(d);
      carriedReinforceAreas.push({
        domain: d,
        labelRu: liveTrainingMetricDomainLabelRu(d),
        reason: `После замечаний к ${p.playerName} — стоит закрепить в следующем цикле.`,
      });
    }
  }

  if (carriedReinforceAreas.length === 0 && outcome.topDomains.length >= 2) {
    const d = outcome.topDomains[1];
    if (d) {
      carriedReinforceAreas.push({
        domain: d,
        labelRu: liveTrainingMetricDomainLabelRu(d),
        reason: "Вторая по частоте тема — полезно повторить в работе.",
      });
    }
  }

  const summaryLines: string[] = [];
  if (carriedFocusPlayers.length > 0) {
    const ns = carriedFocusPlayers
      .slice(0, 3)
      .map((p) => firstNameOnly(p.playerName))
      .join(", ");
    summaryLines.push(`В следующий старт переносим фокус на: ${ns}.`);
  }
  if (carriedDomains.length > 0) {
    summaryLines.push(`Темы из этой тренировки: ${carriedDomains.map((x) => x.labelRu).join(", ")}.`);
  }
  if (outcome.signalsCreatedCount === 0) {
    summaryLines.push("Сигналов аналитики не создано — перенос по игрокам и темам минимален.");
  }

  return {
    version: LIVE_TRAINING_CONTINUITY_SNAPSHOT_VERSION,
    generatedAt: generatedAt.toISOString(),
    teamId,
    carriedFocusPlayers,
    carriedDomains,
    carriedReinforceAreas: carriedReinforceAreas.slice(0, MAX_REINFORCE),
    summaryLines: summaryLines.slice(0, 3),
  };
}

export function parseLiveTrainingContinuitySnapshotFromDb(raw: unknown): LiveTrainingContinuitySnapshotDto | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== LIVE_TRAINING_CONTINUITY_SNAPSHOT_VERSION) return null;
  if (typeof o.generatedAt !== "string" || typeof o.teamId !== "string") return null;
  if (!Array.isArray(o.carriedFocusPlayers) || !Array.isArray(o.carriedDomains)) return null;
  return raw as LiveTrainingContinuitySnapshotDto;
}

/** PHASE 47: сколько последних подтверждений читать для паттернов (не полный скан истории). */
export const RECENT_CONTINUITY_HISTORY_LIMIT = 3;

/**
 * Несколько последних подтверждённых сессий с парсабельным continuity (новые первые).
 */
export async function fetchRecentConfirmedLiveTrainingContinuitySnapshots(
  teamId: string,
  coachId: string,
  limit: number = RECENT_CONTINUITY_HISTORY_LIMIT
): Promise<LiveTrainingContinuitySnapshotDto[]> {
  const sessions = await prisma.liveTrainingSession.findMany({
    where: { teamId, coachId, status: "confirmed" },
    orderBy: { confirmedAt: "desc" },
    take: limit,
    select: { continuitySnapshotJson: true },
  });
  const out: LiveTrainingContinuitySnapshotDto[] = [];
  for (const row of sessions) {
    if (row.continuitySnapshotJson == null) continue;
    const parsed = parseLiveTrainingContinuitySnapshotFromDb(row.continuitySnapshotJson);
    if (parsed) out.push(parsed);
  }
  return out;
}

/** Последняя подтверждённая сессия команды с валидным snapshot (или null). */
export async function fetchLastConfirmedLiveTrainingContinuitySnapshot(
  teamId: string,
  coachId: string
): Promise<LiveTrainingContinuitySnapshotDto | null> {
  const batch = await fetchRecentConfirmedLiveTrainingContinuitySnapshots(teamId, coachId, 1);
  return batch[0] ?? null;
}
