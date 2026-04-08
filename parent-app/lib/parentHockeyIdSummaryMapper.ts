import type { ParentProfessionalStatsViewModel } from "@/lib/professionalStatsUiMapper";

export type ParentHockeyIdSummary = {
  headline: string;
  supporting: string;
};

export function mapProfessionalStatsToHockeyIdSummary(
  model: ParentProfessionalStatsViewModel | null
): ParentHockeyIdSummary | null {
  if (!model || !model.hasData) return null;
  return {
    headline: model.statusLabel,
    supporting: model.detailLine,
  };
}
