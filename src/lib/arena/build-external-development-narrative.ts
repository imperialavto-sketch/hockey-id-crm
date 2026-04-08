import {
  getLatestExternalTrainingRequestForParentPlayer,
  type ExternalTrainingRequestRecord,
} from "@/lib/arena/external-training-requests";
import { getLatestExternalTrainingReportForPlayer } from "@/lib/arena/external-training-reports";
import type { ExternalTrainingReport } from "@prisma/client";

export type ExternalDevelopmentNarrativeView = {
  hasExternalSupport: boolean;
  title: string;
  summary: string;
  emphasis: "subtle" | "active";
  sourcePriorityLabel: string;
  keyPoints: string[];
};

const SOURCE_PRIORITY_LABEL =
  "Дополнительный источник · меньший приоритет, чем данные школы";

function truncateBullet(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function focusBulletFromRequest(req: ExternalTrainingRequestRecord): string {
  if (req.skillKey?.trim()) {
    return `Внешний фокус: ${req.skillKey.trim()}`;
  }
  if (req.reasonSummary?.trim()) {
    return `Внешний фокус: ${truncateBullet(req.reasonSummary, 96)}`;
  }
  return "Внешний фокус передан в дополнительный контур развития";
}

function reportBelongsToRequest(
  report: ExternalTrainingReport,
  request: ExternalTrainingRequestRecord
): boolean {
  return report.requestId === request.id;
}

/**
 * Narrative для родительского профиля: активный запрос этого родителя (как GET /request) + latest report по игроку.
 * `parentId` обязателен для скоупа; в API передаётся из сессии родителя.
 */
export async function buildExternalDevelopmentNarrative(params: {
  playerId: string;
  parentId: string;
}): Promise<ExternalDevelopmentNarrativeView | null> {
  const playerId = params.playerId.trim();
  const parentId = params.parentId.trim();
  if (!playerId || !parentId) return null;

  const request = await getLatestExternalTrainingRequestForParentPlayer({
    parentId,
    playerId,
  });
  if (!request) return null;

  const report = await getLatestExternalTrainingReportForPlayer(playerId);
  const hasAlignedReport =
    report != null && reportBelongsToRequest(report, request);

  if (!hasAlignedReport) {
    return {
      hasExternalSupport: true,
      title: "Арена ведёт дополнительный контур развития",
      summary:
        "Дополнительная работа уже организована: фокус тренировки передан, контур ведётся отдельно от школы. Это дополняет основную подготовку и учитывается как дополнительный источник с меньшим приоритетом.",
      emphasis: "subtle",
      sourcePriorityLabel: SOURCE_PRIORITY_LABEL,
      keyPoints: [
        focusBulletFromRequest(request),
        "Следующий шаг в дополнительном контуре пока ожидается.",
      ],
    };
  }

  const points: string[] = [focusBulletFromRequest(request)];
  if (report.summary.trim()) {
    points.push(truncateBullet(report.summary, 140));
  }
  if (report.nextSteps?.trim()) {
    points.push(`Следующий фокус: ${truncateBullet(report.nextSteps.trim(), 120)}`);
  }

  return {
    hasExternalSupport: true,
    title: "Дополнительная работа дополняет развитие игрока",
    summary:
      "По дополнительному контуру зафиксирован внешний фокус и краткий итог сессии; сигнал поддерживает картину развития и учитывается как дополнительный источник, не заменяя данные школы.",
    emphasis: "active",
    sourcePriorityLabel: SOURCE_PRIORITY_LABEL,
    keyPoints: points.slice(0, 3),
  };
}
