/**
 * Мягкий ориентир для родителя (без рекомендаций, без «сделайте» и без агента).
 */

export type ArenaParentGuidanceLevel = "light" | "focus" | "important";

export type ArenaParentGuidance = {
  guidanceTitle: string;
  guidanceText: string;
  guidanceLevel: ArenaParentGuidanceLevel;
};
