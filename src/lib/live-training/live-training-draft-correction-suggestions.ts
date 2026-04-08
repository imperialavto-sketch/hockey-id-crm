/**
 * PHASE 23: rule-based подсказки быстрых правок на review (без LLM).
 * PHASE 34: block-aware sourceLayer + приоритет по слою структуры тренировки.
 * PHASE 35: suggestionPriority / suggestionConfidence + сортировка по tier.
 */

import type { LiveTrainingObservationSentiment } from "@prisma/client";
import { LIVE_TRAINING_EDITABLE_CATEGORIES } from "./live-training-draft-mutations";
import type { LiveTrainingIngestProvenanceDto } from "./live-training-ingest-provenance";

const CATEGORY_LABEL_RU: Record<string, string> = {
  praise: "Похвала",
  correction: "Коррекция",
  attention: "Внимание / слушание",
  discipline: "Дисциплина",
  effort: "Вклад / доработка",
  ofp_technique: "ОФП / техника тела",
  skating: "Катание",
  shooting: "Броски",
  puck_control: "Ведение / контроль шайбы",
  pace: "Темп / скорость",
  general_observation: "Общее наблюдение",
  общее: "Общее наблюдение",
};

const SUGGESTION_CONFIDENCE_MIN = 0.42;

export type LiveTrainingDraftCorrectionSuggestionSourceLayer =
  | "focus_block"
  | "main_block"
  | "reinforcement_block"
  | "warmup_block"
  | "snapshot";

export type LiveTrainingDraftCorrectionSuggestionPriority = "high" | "medium" | "low";

export type LiveTrainingDraftCorrectionSuggestionConfidence = "high" | "medium" | "low";

export type LiveTrainingDraftCorrectionSuggestionDto = {
  id: string;
  suggestionType: "player" | "category" | "sentiment";
  label: string;
  value: string;
  tone: "neutral" | "attention" | "positive";
  patch: {
    playerId?: string | null;
    playerNameRaw?: string | null;
    category?: string;
    sentiment?: LiveTrainingObservationSentiment;
  };
  /** PHASE 34: происхождение подсказки для explainability в UI */
  sourceLayer?: LiveTrainingDraftCorrectionSuggestionSourceLayer;
  /** PHASE 35: важность для review (сортировка + лёгкий акцент в UI) */
  suggestionPriority: LiveTrainingDraftCorrectionSuggestionPriority;
  /** PHASE 35: оценка надёжности сигнала */
  suggestionConfidence: LiveTrainingDraftCorrectionSuggestionConfidence;
};

function categoryLabelRu(slug: string): string {
  const t = slug.trim();
  return CATEGORY_LABEL_RU[t] ?? t;
}

function sentimentLabelRu(s: LiveTrainingObservationSentiment): string {
  if (s === "positive") return "Плюс";
  if (s === "negative") return "Минус";
  return "Нейтрально";
}

function isLooseCategory(cat: string): boolean {
  const c = cat.trim();
  return c === "general_observation" || c === "общее";
}

function confidenceOkForNudge(provenance: LiveTrainingIngestProvenanceDto | null): boolean {
  if (!provenance) return false;
  const a = provenance.parserConfidenceAfterContext;
  return typeof a === "number" && Number.isFinite(a) && a >= SUGGESTION_CONFIDENCE_MIN;
}

type DraftSnapshotForSuggestions = {
  playerId: string | null;
  category: string;
  sentiment: string;
  needsReview: boolean;
};

type Candidate = {
  sortTier: number;
  priority: number;
  dto: LiveTrainingDraftCorrectionSuggestionDto;
};

function priorityTierRank(t: LiveTrainingDraftCorrectionSuggestionPriority): number {
  if (t === "high") return 3;
  if (t === "medium") return 2;
  return 1;
}

function computeSuggestionPriority(
  suggestionType: LiveTrainingDraftCorrectionSuggestionDto["suggestionType"],
  layer: LiveTrainingDraftCorrectionSuggestionSourceLayer,
  needsReview: boolean
): LiveTrainingDraftCorrectionSuggestionPriority {
  if (layer === "warmup_block") return "low";
  if (suggestionType === "player") {
    if (layer === "focus_block") return "high";
    /* needsReview + игрок из контекста (snapshot): важнее в очереди review */
    return needsReview ? "high" : "medium";
  }
  if (suggestionType === "category") {
    if (layer === "main_block") return "high";
    return "medium";
  }
  if (layer === "reinforcement_block") return "medium";
  return "low";
}

function computeSuggestionConfidence(
  suggestionType: LiveTrainingDraftCorrectionSuggestionDto["suggestionType"],
  layer: LiveTrainingDraftCorrectionSuggestionSourceLayer,
  provenance: LiveTrainingIngestProvenanceDto | null
): LiveTrainingDraftCorrectionSuggestionConfidence {
  if (layer === "warmup_block") return "low";
  if (suggestionType === "player") {
    return layer === "focus_block" ? "high" : "low";
  }
  if (suggestionType === "category") {
    if (layer === "main_block") {
      return confidenceOkForNudge(provenance) ? "high" : "low";
    }
    if (layer === "snapshot") return "medium";
    return "medium";
  }
  if (layer === "reinforcement_block") return "medium";
  return "low";
}

function playerSourceLayer(p: LiveTrainingIngestProvenanceDto): LiveTrainingDraftCorrectionSuggestionSourceLayer {
  return p.contextAdjustedPlayerMatchSource === "focus_block" ? "focus_block" : "snapshot";
}

function categorySourceLayer(p: LiveTrainingIngestProvenanceDto): LiveTrainingDraftCorrectionSuggestionSourceLayer {
  const s = p.contextAdjustedCategorySource;
  if (s === "main_block") return "main_block";
  if (s === "reinforcement_block") return "reinforcement_block";
  if (s === "warmup_block") return "warmup_block";
  return "snapshot";
}

function sentimentSourceLayer(p: LiveTrainingIngestProvenanceDto): LiveTrainingDraftCorrectionSuggestionSourceLayer {
  return p.contextAdjustedSentimentSource === "reinforcement_block" ? "reinforcement_block" : "snapshot";
}

function priorityPlayer(layer: LiveTrainingDraftCorrectionSuggestionSourceLayer): number {
  return layer === "focus_block" ? 100 : 87;
}

function priorityCategory(layer: LiveTrainingDraftCorrectionSuggestionSourceLayer): number {
  if (layer === "main_block") return 90;
  if (layer === "reinforcement_block") return 82;
  if (layer === "warmup_block") return 78;
  return 70;
}

function prioritySentiment(layer: LiveTrainingDraftCorrectionSuggestionSourceLayer): number {
  return layer === "reinforcement_block" ? 88 : 65;
}

/**
 * До 3 подсказок с приоритетом: focus player → main category → reinforcement sentiment → остальное.
 */
export function buildLiveTrainingDraftCorrectionSuggestions(
  draft: DraftSnapshotForSuggestions,
  provenance: LiveTrainingIngestProvenanceDto | null
): LiveTrainingDraftCorrectionSuggestionDto[] {
  if (!provenance?.contextUsed) return [];

  const candidates: Candidate[] = [];

  const sid = provenance.contextSuggestionPlayerId?.trim();
  const sname = provenance.contextSuggestionPlayerName?.trim();
  if (provenance.contextAdjustedPlayerMatch && sid && draft.playerId !== sid) {
    const layer = playerSourceLayer(provenance);
    const sp = computeSuggestionPriority("player", layer, draft.needsReview);
    const sc = computeSuggestionConfidence("player", layer, provenance);
    candidates.push({
      sortTier: priorityTierRank(sp),
      priority: priorityPlayer(layer),
      dto: {
        id: `player:${sid}`,
        suggestionType: "player",
        label: "Игрок",
        value: sname || "Игрок",
        tone: "attention",
        patch: { playerId: sid, playerNameRaw: sname ?? null },
        sourceLayer: layer,
        suggestionPriority: sp,
        suggestionConfidence: sc,
      },
    });
  }

  const cat = provenance.contextSuggestionCategory?.trim();
  if (
    provenance.contextAdjustedCategory &&
    cat &&
    LIVE_TRAINING_EDITABLE_CATEGORIES.has(cat) &&
    isLooseCategory(draft.category) &&
    draft.category.trim() !== cat &&
    confidenceOkForNudge(provenance)
  ) {
    const layer = categorySourceLayer(provenance);
    const sp = computeSuggestionPriority("category", layer, draft.needsReview);
    const sc = computeSuggestionConfidence("category", layer, provenance);
    candidates.push({
      sortTier: priorityTierRank(sp),
      priority: priorityCategory(layer),
      dto: {
        id: `category:${cat}`,
        suggestionType: "category",
        label: "Категория",
        value: categoryLabelRu(cat),
        tone: "neutral",
        patch: { category: cat },
        sourceLayer: layer,
        suggestionPriority: sp,
        suggestionConfidence: sc,
      },
    });
  }

  const sent = provenance.contextSuggestionSentiment;
  if (
    provenance.contextAdjustedSentiment &&
    sent &&
    sent !== "neutral" &&
    draft.sentiment === "neutral" &&
    confidenceOkForNudge(provenance)
  ) {
    const layer = sentimentSourceLayer(provenance);
    const sp = computeSuggestionPriority("sentiment", layer, draft.needsReview);
    const sc = computeSuggestionConfidence("sentiment", layer, provenance);
    candidates.push({
      sortTier: priorityTierRank(sp),
      priority: prioritySentiment(layer),
      dto: {
        id: `sentiment:${sent}`,
        suggestionType: "sentiment",
        label: "Тональность",
        value: sentimentLabelRu(sent),
        tone: sent === "positive" ? "positive" : "neutral",
        patch: { sentiment: sent },
        sourceLayer: layer,
        suggestionPriority: sp,
        suggestionConfidence: sc,
      },
    });
  }

  candidates.sort((a, b) => {
    if (b.sortTier !== a.sortTier) return b.sortTier - a.sortTier;
    return b.priority - a.priority;
  });
  return candidates.slice(0, 3).map((c) => c.dto);
}
