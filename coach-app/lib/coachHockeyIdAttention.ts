/**
 * Hockey ID attention preview levels for schedule session chips (labels + union type).
 */

export type CoachHockeyIdAttentionLevel =
  | "attention_high"
  | "attention_medium"
  | "stable"
  | "low";

export const COACH_HOCKEY_ID_PREVIEW_LABEL: Record<
  CoachHockeyIdAttentionLevel,
  string
> = {
  attention_high: "Высокий фокус",
  attention_medium: "Средний фокус",
  stable: "Стабильно",
  low: "Без сигнала",
};
