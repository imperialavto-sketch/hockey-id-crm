import { prisma } from "@/lib/prisma";
import {
  getLatestActiveExternalTrainingRequestForPlayer,
  getLatestExternalTrainingRequestForParentPlayer,
} from "@/lib/arena/external-training-requests";

export type PlayerDevelopmentPhase = "active_focus" | "consolidation" | "passive";

const MS_PER_DAY = 86_400_000;

/**
 * Горизонт развития по игроку (детерминированно, без LLM).
 * Опирается на активный внешний запрос и давность последнего external report.
 * При передаче parentId активный запрос считается в рамках этого родителя (как в follow-up API).
 */
export async function buildPlayerDevelopmentPhase(params: {
  playerId: string;
  parentId?: string | null;
}): Promise<PlayerDevelopmentPhase> {
  const playerId = params.playerId.trim();
  if (!playerId) return "passive";

  const parentId = params.parentId?.trim() ?? null;
  const activeRequest = parentId
    ? await getLatestExternalTrainingRequestForParentPlayer({ playerId, parentId })
    : await getLatestActiveExternalTrainingRequestForPlayer({ playerId });

  const latestReport = await prisma.externalTrainingReport.findFirst({
    where: { playerId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (!latestReport) {
    return activeRequest ? "active_focus" : "passive";
  }

  const daysSinceReport =
    (Date.now() - latestReport.createdAt.getTime()) / MS_PER_DAY;

  if (daysSinceReport >= 14) {
    return activeRequest ? "active_focus" : "passive";
  }

  if (activeRequest || daysSinceReport < 5) {
    return "active_focus";
  }

  return "consolidation";
}

export function phaseLabelRu(phase: PlayerDevelopmentPhase): string {
  switch (phase) {
    case "active_focus":
      return "Активная проработка";
    case "consolidation":
      return "Закрепление";
    case "passive":
      return "Наблюдение";
  }
}
