/**
 * STEP 19: pending/confirmed/dismissed для кандидатов из suggestedActions.recommendedCoaches (extra_training).
 */

import { prisma } from "@/lib/prisma";
import type { LiveTrainingSessionReportDraftSummary } from "@/lib/live-training/live-training-session-report-draft";

export const EXTERNAL_COACH_RECOMMENDATION_STATUS = {
  pending: "pending",
  confirmed: "confirmed",
  dismissed: "dismissed",
} as const;

export type ExternalCoachRecommendationRowDto = {
  id: string;
  liveSessionId: string;
  playerId: string | null;
  externalCoachId: string;
  triggerType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

function normalizePlayerId(playerId: string | null | undefined): string | null {
  if (playerId == null || String(playerId).trim() === "") return null;
  return String(playerId).trim();
}

function mapRow(r: {
  id: string;
  liveSessionId: string;
  playerId: string | null;
  externalCoachId: string;
  triggerType: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): ExternalCoachRecommendationRowDto {
  return {
    id: r.id,
    liveSessionId: r.liveSessionId,
    playerId: r.playerId,
    externalCoachId: r.externalCoachId,
    triggerType: r.triggerType,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/** Пары (внешний тренер + контекст игрока) из сохранённого summary — без дублирования логики триггеров. */
export function collectExternalCoachPairsFromSuggestedSummary(
  summary: LiveTrainingSessionReportDraftSummary
): Array<{ externalCoachId: string; playerId: string | null; triggerType: string }> {
  const sa = summary.sessionMeaningSuggestedActionsV1;
  if (!sa?.coach?.length) return [];
  const out: Array<{ externalCoachId: string; playerId: string | null; triggerType: string }> = [];
  for (const action of sa.coach) {
    if (action.type !== "extra_training") continue;
    const playerId = normalizePlayerId(action.playerId);
    if (!action.recommendedCoaches?.length) continue;
    for (const rc of action.recommendedCoaches) {
      const id = rc.id?.trim();
      if (!id) continue;
      out.push({ externalCoachId: id, playerId, triggerType: "extra_training" });
    }
  }
  return out;
}

export async function syncPendingExternalCoachRecommendations(
  liveSessionId: string,
  summary: LiveTrainingSessionReportDraftSummary
): Promise<void> {
  const pairs = collectExternalCoachPairsFromSuggestedSummary(summary);
  for (const p of pairs) {
    const existing = await prisma.externalCoachRecommendation.findFirst({
      where: {
        liveSessionId,
        externalCoachId: p.externalCoachId,
        playerId: p.playerId,
      },
    });
    if (!existing) {
      await prisma.externalCoachRecommendation.create({
        data: {
          liveSessionId,
          playerId: p.playerId,
          externalCoachId: p.externalCoachId,
          triggerType: p.triggerType,
          status: EXTERNAL_COACH_RECOMMENDATION_STATUS.pending,
        },
      });
    }
  }
}

export async function listExternalCoachRecommendationsForSession(
  liveSessionId: string
): Promise<ExternalCoachRecommendationRowDto[]> {
  const rows = await prisma.externalCoachRecommendation.findMany({
    where: { liveSessionId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(mapRow);
}

export async function confirmExternalCoachRecommendation(params: {
  liveSessionId: string;
  externalCoachId: string;
  playerId?: string | null;
}): Promise<ExternalCoachRecommendationRowDto> {
  const playerId = normalizePlayerId(params.playerId);
  let row = await prisma.externalCoachRecommendation.findFirst({
    where: {
      liveSessionId: params.liveSessionId,
      externalCoachId: params.externalCoachId,
      playerId,
    },
  });
  if (!row) {
    row = await prisma.externalCoachRecommendation.create({
      data: {
        liveSessionId: params.liveSessionId,
        playerId,
        externalCoachId: params.externalCoachId,
        triggerType: "extra_training",
        status: EXTERNAL_COACH_RECOMMENDATION_STATUS.confirmed,
      },
    });
  } else {
    row = await prisma.externalCoachRecommendation.update({
      where: { id: row.id },
      data: { status: EXTERNAL_COACH_RECOMMENDATION_STATUS.confirmed },
    });
  }
  return mapRow(row);
}

export async function dismissExternalCoachRecommendation(params: {
  liveSessionId: string;
  recommendationId: string;
}): Promise<ExternalCoachRecommendationRowDto> {
  const row = await prisma.externalCoachRecommendation.findFirst({
    where: { id: params.recommendationId, liveSessionId: params.liveSessionId },
  });
  if (!row) {
    throw new Error("ExternalCoachRecommendation not found");
  }
  const updated = await prisma.externalCoachRecommendation.update({
    where: { id: row.id },
    data: { status: EXTERNAL_COACH_RECOMMENDATION_STATUS.dismissed },
  });
  return mapRow(updated);
}
