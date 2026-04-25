/**
 * Verification-first inventory: live-training **draft category → analytics signal** (`metricDomain` / `metricKey`)
 * vs Prisma **`SkillProgress.skill` (`SkillType`)**.
 *
 * - **Not** SSOT product truth, **not** a mapping helper for writes, **not** an API contract.
 * - Canonical write path for signals remains `CATEGORY_MAP` in `map-live-training-draft-to-analytics-signals.ts`;
 *   this file must stay aligned with that map (same `sourceCategory` keys and domain/key pairs).
 *
 * Misleading naming (inventory only):
 * - `computeDevelopmentGapFromPlayerSignals` — reads `SkillProgress`, parent evaluations, `BehaviorLog`;
 *   it does **not** read `LiveTrainingPlayerSignal` rows despite the filename.
 *
 * Label SSOT for server coach signal APIs: `player-live-training-signals-labels.ts`.
 * Coach-app duplicate: `coach-app/lib/liveTrainingMetricDomainLabel.ts` — can diverge (see `UI_LABEL_DIVERGENCES`).
 */

import type { SkillType } from "@prisma/client";

/** Intentional bridge status to `SkillProgress.SkillType` — never implies DB or write linkage. */
export type LiveTrainingAnalyticsOntologyRelationshipStatus =
  | "none"
  | "proposed"
  | "conflict"
  | "unclear";

export type LiveTrainingAnalyticsCategoryRegistryEntry = {
  /** Key in `CATEGORY_MAP` (`map-live-training-draft-to-analytics-signals.ts`). */
  sourceCategory: string;
  metricDomain: string;
  metricKey: string;
  /** Mirrors `liveTrainingMetricDomainLabelRu(metricDomain)` in `player-live-training-signals-labels.ts`. */
  domainLabelRuOfficial: string;
  /** Mirrors `liveTrainingMetricKeyLabelRu(metricKey)` in `player-live-training-signals-labels.ts`. */
  metricKeyLabelRuOfficial: string;
  /** Optional conceptual link to `SkillType`; `null` with `none` is expected for most rows. */
  relatedSkillType: SkillType | null;
  relationshipStatus: LiveTrainingAnalyticsOntologyRelationshipStatus;
  note: string;
};

/**
 * One row per `CATEGORY_MAP` entry (same order as in source file for scanability).
 * Unknown draft categories at runtime fall through to `general_observation` — that row is the fallback bucket.
 */
export const LIVE_TRAINING_ANALYTICS_CATEGORY_REGISTRY: readonly LiveTrainingAnalyticsCategoryRegistryEntry[] =
  [
    {
      sourceCategory: "praise",
      metricDomain: "engagement",
      metricKey: "coach_feedback_positive",
      domainLabelRuOfficial: "Вовлечённость",
      metricKeyLabelRuOfficial: "Похвала",
      relatedSkillType: null,
      relationshipStatus: "none",
      note: "Engagement / coach feedback — no direct `SkillType` column; not player skill ontology.",
    },
    {
      sourceCategory: "correction",
      metricDomain: "coachability",
      metricKey: "correction_needed",
      domainLabelRuOfficial: "Реакция на коррекцию",
      metricKeyLabelRuOfficial: "Коррекция",
      relatedSkillType: null,
      relationshipStatus: "unclear",
      note: "Meta-coachability axis; any `SkillType` link would be heuristic only.",
    },
    {
      sourceCategory: "attention",
      metricDomain: "behavior",
      metricKey: "attention",
      domainLabelRuOfficial: "Поведение",
      metricKeyLabelRuOfficial: "Внимание к заданию",
      relatedSkillType: null,
      relationshipStatus: "none",
      note: "Used with `behavior` domain in behavioral-suggestions API; not a `SkillProgress` row kind.",
    },
    {
      sourceCategory: "discipline",
      metricDomain: "behavior",
      metricKey: "discipline",
      domainLabelRuOfficial: "Поведение",
      metricKeyLabelRuOfficial: "Дисциплина",
      relatedSkillType: null,
      relationshipStatus: "none",
      note: "Same domain `behavior` as attention; orthogonal to Prisma `SkillType` enum.",
    },
    {
      sourceCategory: "effort",
      metricDomain: "workrate",
      metricKey: "effort",
      domainLabelRuOfficial: "Работа и старание",
      metricKeyLabelRuOfficial: "Старание",
      relatedSkillType: null,
      relationshipStatus: "none",
      note: "Workrate axis has no `SkillType` counterpart.",
    },
    {
      sourceCategory: "ofp_technique",
      metricDomain: "ofp",
      metricKey: "technique_execution",
      domainLabelRuOfficial: "ОФП",
      metricKeyLabelRuOfficial: "Техника тела",
      relatedSkillType: null,
      relationshipStatus: "none",
      note: "`SkillType` has no OFP-specific value; do not map to BALANCE without an explicit product decision.",
    },
    {
      sourceCategory: "skating",
      metricDomain: "skating",
      metricKey: "skating_execution",
      domainLabelRuOfficial: "Катание",
      metricKeyLabelRuOfficial: "Катание",
      relatedSkillType: "SKATING",
      relationshipStatus: "proposed",
      note: "Closest `SkillType`; live slug is analytics-facing, not the same persistence path as `SkillProgress`.",
    },
    {
      sourceCategory: "shooting",
      metricDomain: "shooting",
      metricKey: "shooting_execution",
      domainLabelRuOfficial: "Броски",
      metricKeyLabelRuOfficial: "Броски",
      relatedSkillType: "SHOOTING",
      relationshipStatus: "proposed",
      note: "Same naming overlap as skating row; still separate tables / lifecycles.",
    },
    {
      sourceCategory: "puck_control",
      metricDomain: "puck_control",
      metricKey: "puck_control_execution",
      domainLabelRuOfficial: "Контроль шайбы",
      metricKeyLabelRuOfficial: "Ведение",
      relatedSkillType: "STICKHANDLING",
      relationshipStatus: "unclear",
      note: "Closest skill family is stickhandling; puck control is broader — `unclear` avoids false precision.",
    },
    {
      sourceCategory: "pace",
      metricDomain: "pace",
      metricKey: "pace",
      domainLabelRuOfficial: "Темп",
      metricKeyLabelRuOfficial: "Темп",
      relatedSkillType: null,
      relationshipStatus: "none",
      note: "No `SkillType` for pace; team/system axis.",
    },
    {
      sourceCategory: "general_observation",
      metricDomain: "general",
      metricKey: "coach_observation",
      domainLabelRuOfficial: "Общие наблюдения",
      metricKeyLabelRuOfficial: "Наблюдение",
      relatedSkillType: null,
      relationshipStatus: "none",
      note: "Fallback for unknown `draft.category` after `normalizeCategoryKey` — catch-all bucket.",
    },
  ] as const;

/** Prisma `SkillType` enum members (player `SkillProgress.skill`) — orthogonal namespace to live `metricDomain`. */
export const SKILL_PROGRESS_SKILL_TYPE_INVENTORY: readonly SkillType[] = [
  "SKATING",
  "STICKHANDLING",
  "PASSING",
  "SHOOTING",
  "BALANCE",
  "GAME_WITHOUT_PUCK",
  "ONE_ON_ONE",
] as const;

/** Keys that appear only in `liveTrainingMetricKeyLabelRu` for OFP domain (`ofp` + `technique_execution`). */
export const METRIC_KEY_SHARED_TECHNIQUE_EXECUTION_NOTE =
  "`technique_execution` label is shared for OFP `technique_execution` key; only one entry in key-label map.";

/** Coach-app vs server RU copy for the same domain slug (cognitive hazard for future mapping UI). */
export const LIVE_TRAINING_DOMAIN_LABEL_UI_DIVERGENCES: readonly {
  metricDomain: string;
  serverLabelRu: string;
  coachAppLabelRu: string;
}[] = [
  {
    metricDomain: "workrate",
    serverLabelRu: "Работа и старание",
    coachAppLabelRu: "Работоспособность",
  },
  {
    metricDomain: "puck_control",
    serverLabelRu: "Контроль шайбы",
    coachAppLabelRu: "Ведение",
  },
];

export const MISLEADING_MODULE_NAMES: readonly { id: string; path: string; note: string }[] = [
  {
    id: "computeDevelopmentGapFromPlayerSignals",
    path: "src/lib/arena/compute-development-gap-from-player-signals.ts",
    note: "Does not query `LiveTrainingPlayerSignal`; uses SkillProgress, parent evals, BehaviorLog.",
  },
];
