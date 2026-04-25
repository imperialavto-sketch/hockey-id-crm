/**
 * Registry-backed read-only bridge: live analytics (`metricDomain` + `metricKey`) → development facet hints.
 *
 * **Semantic boundaries**
 * - Uses **only** {@link LIVE_TRAINING_ANALYTICS_CATEGORY_REGISTRY}; no ad hoc rules from other modules.
 * - **Not** a universal ontology or product truth; **not** authorization to write `SkillProgress` or change signals.
 * - `relationshipStatus` values **`proposed`** and **`unclear`** must not be treated as hard facts in product logic
 *   without an explicit product/data decision.
 * - **`null`** means the (trimmed) pair is **absent** from the registry (unknown metric, legacy drift, or typo) —
 *   a valid outcome; callers must not coerce `null` into a default `SkillType`.
 *
 * @see `live-training-analytics-category-registry.ts`
 */

import type { SkillType } from "@prisma/client";
import {
  LIVE_TRAINING_ANALYTICS_CATEGORY_REGISTRY,
  type LiveTrainingAnalyticsCategoryRegistryEntry,
  type LiveTrainingAnalyticsOntologyRelationshipStatus,
} from "@/lib/arena/development-ontology/live-training-analytics-category-registry";

export type LiveMetricDevelopmentFacetMapping = {
  metricDomain: string;
  metricKey: string;
  relatedSkillType: SkillType | null;
  relationshipStatus: LiveTrainingAnalyticsOntologyRelationshipStatus;
  /** `CATEGORY_MAP` key when this pair is listed in the registry; otherwise omitted in practice (always set when non-null). */
  sourceCategory: string | null;
  /** Registry row note (why `none` / `unclear` / `proposed`). */
  note?: string;
};

const REGISTRY_BY_METRIC_PAIR = (() => {
  const m = new Map<string, LiveTrainingAnalyticsCategoryRegistryEntry>();
  for (const row of LIVE_TRAINING_ANALYTICS_CATEGORY_REGISTRY) {
    m.set(`${row.metricDomain}\0${row.metricKey}`, row);
  }
  return m;
})();

/**
 * Looks up `(metricDomain, metricKey)` after trimming. Returns **`null`** when the pair is not in the registry
 * (strict: no synthetic “unknown” object — keeps the contract small).
 */
export function mapLiveMetricToDevelopmentFacet(
  metricDomain: string,
  metricKey: string
): LiveMetricDevelopmentFacetMapping | null {
  const d = metricDomain.trim();
  const k = metricKey.trim();
  if (!d || !k) return null;

  const row = REGISTRY_BY_METRIC_PAIR.get(`${d}\0${k}`);
  if (!row) return null;

  return {
    metricDomain: row.metricDomain,
    metricKey: row.metricKey,
    relatedSkillType: row.relatedSkillType,
    relationshipStatus: row.relationshipStatus,
    sourceCategory: row.sourceCategory,
    note: row.note,
  };
}
