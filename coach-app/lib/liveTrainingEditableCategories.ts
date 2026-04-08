/**
 * Slug категорий, разрешённых для правки на review (как на сервере `LIVE_TRAINING_EDITABLE_CATEGORY_ORDER`).
 */

export const LIVE_TRAINING_EDITABLE_CATEGORY_ORDER = [
  "praise",
  "correction",
  "attention",
  "discipline",
  "effort",
  "ofp_technique",
  "skating",
  "shooting",
  "puck_control",
  "pace",
  "general_observation",
  "общее",
] as const;

export type LiveTrainingEditableCategorySlug =
  (typeof LIVE_TRAINING_EDITABLE_CATEGORY_ORDER)[number];

export const LIVE_TRAINING_EDITABLE_CATEGORY_SLUG_SET = new Set<string>(
  LIVE_TRAINING_EDITABLE_CATEGORY_ORDER
);
