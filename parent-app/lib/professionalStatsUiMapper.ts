import type { ParentProfessionalStatsRaw } from "@/services/professionalPlayerStatsService";

export type ParentProfessionalStatsViewModel = {
  displayFirstName: string;
  hasData: boolean;
  statusLabel: string;
  detailLine: string;
};

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

/**
 * Map API payload (or null when route missing / empty) to a compact card model.
 */
export function mapProfessionalStatsToViewModel(
  raw: ParentProfessionalStatsRaw | null,
  displayFirst: string
): ParentProfessionalStatsViewModel {
  const displayFirstName = displayFirst.trim() || "Игрок";

  if (!raw) {
    return {
      displayFirstName,
      hasData: false,
      statusLabel: "Пока без записей Hockey ID",
      detailLine:
        "После занятий тренер сможет фиксировать игровую динамику — здесь появится краткий статус.",
    };
  }

  const headline =
    str(raw.statusLabel) ??
    str(raw.headline) ??
    str(raw.title) ??
    str((raw.summary as Record<string, unknown>)?.headline);
  const detail =
    str(raw.detailLine) ??
    str(raw.subtitle) ??
    str(raw.body) ??
    str((raw.summary as Record<string, unknown>)?.text);

  if (headline || detail) {
    return {
      displayFirstName,
      hasData: true,
      statusLabel: headline ?? "Сводка Hockey ID",
      detailLine:
        detail ??
        "Краткий статус по играм и тренировкам — смотрите также хронологию ниже.",
    };
  }

  return {
    displayFirstName,
    hasData: false,
    statusLabel: "Пока без записей Hockey ID",
    detailLine:
      "После занятий тренер сможет фиксировать игровую динамику — здесь появится краткий статус.",
  };
}
