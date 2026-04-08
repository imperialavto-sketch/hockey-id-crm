import { getLatestActiveExternalTrainingRequestForPlayer } from "@/lib/arena/external-training-requests";
import type { ExternalTrainingRequestRecord } from "@/lib/arena/external-training-requests";
import { getLatestExternalTrainingReportForPlayer } from "@/lib/arena/external-training-reports";

export type SchoolExternalDevelopmentSummaryView = {
  hasExternalDevelopment: boolean;
  title: string;
  summary: string;
  priorityLabel: string;
  focusLabel: string | null;
  latestResultSummary: string | null;
  latestNextStep: string | null;
};

const PRIORITY_LABEL = "Дополнительный источник · меньший приоритет";

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function focusLabelFromRequest(req: ExternalTrainingRequestRecord): string {
  if (req.skillKey?.trim()) {
    return req.skillKey.trim();
  }
  if (req.reasonSummary?.trim()) {
    return truncate(req.reasonSummary, 140);
  }
  return "Внешний фокус уточняется в дополнительном контуре";
}

/**
 * Сводка для школы: последний активный запрос по игроку (любой родитель) + последний отчёт.
 * Read-only, без оценки прогресса и без смешивания со школьными метриками.
 */
export async function buildSchoolExternalDevelopmentSummary(
  playerId: string
): Promise<SchoolExternalDevelopmentSummaryView | null> {
  const pid = playerId.trim();
  if (!pid) return null;

  const request = await getLatestActiveExternalTrainingRequestForPlayer({
    playerId: pid,
  });
  const report = await getLatestExternalTrainingReportForPlayer(pid);

  if (!request && !report) return null;

  if (request && (!report || report.requestId !== request.id)) {
    return {
      hasExternalDevelopment: true,
      title: "Дополнительная работа",
      summary:
        "Для игрока организован внешний контур работы по отдельному фокусу.",
      priorityLabel: PRIORITY_LABEL,
      focusLabel: focusLabelFromRequest(request),
      latestResultSummary: null,
      latestNextStep: "Ожидается следующий результат внешней работы.",
    };
  }

  if (request && report && report.requestId === request.id) {
    return {
      hasExternalDevelopment: true,
      title: "Дополнительная работа",
      summary:
        "В системе зафиксирован внешний контур развития с отдельным результатом. Этот сигнал учитывается как дополнительный и не заменяет данные школы.",
      priorityLabel: PRIORITY_LABEL,
      focusLabel: focusLabelFromRequest(request),
      latestResultSummary: report.summary.trim()
        ? truncate(report.summary, 200)
        : null,
      latestNextStep: report.nextSteps?.trim() || null,
    };
  }

  return null;
}
