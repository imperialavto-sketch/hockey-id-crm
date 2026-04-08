import type { ExternalTrainingReport } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export type ExternalTrainingReportView = {
  id: string;
  createdAt: string;
  summary: string;
  resultNotes: string | null;
  nextSteps: string | null;
  focusAreas: string[];
  sourceLayer: {
    type: "external_training_report";
    priority: "low";
    label: string;
    description: string;
  };
};

const SOURCE_LAYER: ExternalTrainingReportView["sourceLayer"] = {
  type: "external_training_report",
  priority: "low",
  label: "Результат дополнительной работы",
  description:
    "Отчёт по внешней тренировке учитывается как дополнительный источник и не заменяет основной контур оценки школы.",
};

function focusAreasToStrings(value: Prisma.JsonValue | null | undefined): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .map((x) =>
        typeof x === "string" ? x.trim() : x != null ? String(x).trim() : ""
      )
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

export function buildExternalTrainingReportView(
  row: ExternalTrainingReport
): ExternalTrainingReportView {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    summary: row.summary,
    resultNotes: row.resultNotes,
    nextSteps: row.nextSteps,
    focusAreas: focusAreasToStrings(row.focusAreas),
    sourceLayer: { ...SOURCE_LAYER },
  };
}
