/**
 * Маппинг подтверждённого черновика живой тренировки → analytics signals (rule-based, без LLM).
 * Без playerId сигналы не создаются (пустой массив).
 */

import type { LiveTrainingObservationSentiment } from "@prisma/client";

export type LiveTrainingDraftForAnalyticsMap = {
  id: string;
  playerId: string | null;
  sourceText: string;
  category: string;
  sentiment: LiveTrainingObservationSentiment;
};

export type LiveTrainingAnalyticsSignalSlice = {
  metricDomain: string;
  metricKey: string;
  signalDirection: LiveTrainingObservationSentiment;
  signalStrength: number;
  evidenceText: string;
};

type CategoryConfig = {
  metricDomain: string;
  metricKey: string;
  /** Если задано — перекрывает sentiment (например похвала всегда positive). */
  forceDirection?: LiveTrainingObservationSentiment;
};

const CATEGORY_MAP: Record<string, CategoryConfig> = {
  praise: {
    metricDomain: "engagement",
    metricKey: "coach_feedback_positive",
    forceDirection: "positive",
  },
  correction: { metricDomain: "coachability", metricKey: "correction_needed" },
  attention: { metricDomain: "behavior", metricKey: "attention" },
  discipline: { metricDomain: "behavior", metricKey: "discipline" },
  effort: { metricDomain: "workrate", metricKey: "effort" },
  ofp_technique: { metricDomain: "ofp", metricKey: "technique_execution" },
  skating: { metricDomain: "skating", metricKey: "skating_execution" },
  shooting: { metricDomain: "shooting", metricKey: "shooting_execution" },
  puck_control: { metricDomain: "puck_control", metricKey: "puck_control_execution" },
  pace: { metricDomain: "pace", metricKey: "pace" },
  general_observation: { metricDomain: "general", metricKey: "coach_observation" },
};

function normalizeCategoryKey(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (t === "общее") return "general_observation";
  return t;
}

/**
 * Один черновик → 0 или 1 сигнал (PHASE 6: без ветвления на несколько метрик).
 */
export function mapLiveTrainingDraftToAnalyticsSignals(
  draft: LiveTrainingDraftForAnalyticsMap
): LiveTrainingAnalyticsSignalSlice[] {
  if (!draft.playerId?.trim()) {
    return [];
  }

  const key = normalizeCategoryKey(draft.category);
  const cfg = CATEGORY_MAP[key] ?? CATEGORY_MAP.general_observation;

  const direction =
    cfg.forceDirection !== undefined ? cfg.forceDirection : draft.sentiment;

  return [
    {
      metricDomain: cfg.metricDomain,
      metricKey: cfg.metricKey,
      signalDirection: direction,
      signalStrength: 1,
      evidenceText: draft.sourceText.trim(),
    },
  ];
}
