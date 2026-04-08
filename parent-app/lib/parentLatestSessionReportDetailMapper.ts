import type { LatestSessionReport } from "@/services/playerService";

function nonEmpty(s: string | null | undefined): boolean {
  return typeof s === "string" && s.trim().length > 0;
}

/** True when parent can open a dedicated «last training» detail (any text slice present). */
export function hasParentLastTrainingDetail(
  report: LatestSessionReport | null
): boolean {
  if (!report) return false;
  return (
    nonEmpty(report.summary) ||
    nonEmpty(report.focusAreas) ||
    nonEmpty(report.parentMessage)
  );
}
