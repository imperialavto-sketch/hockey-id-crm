/**
 * PHASE 22: короткие подсказки по provenance ingest (без сырого JSON и техно-языка).
 * PHASE 33: block-aware / explainable wording по source из PHASE 32.
 */

import type { LiveTrainingDraftProvenance } from "@/types/liveTraining";

const CONFIDENCE_BUMP_THRESHOLD = 0.1;

function hintPlayerMatch(p: LiveTrainingDraftProvenance): string | null {
  if (!p.contextAdjustedPlayerMatch) return null;
  if (p.contextAdjustedPlayerMatchSource === "focus_block") {
    return "Индивидуальный фокус помог выбрать игрока";
  }
  if (p.contextAdjustedPlayerMatchSource === "start_priority") {
    return "Приоритет старта помог выбрать игрока";
  }
  return "Контекст тренировки помог выбрать игрока";
}

function hintCategory(p: LiveTrainingDraftProvenance): string | null {
  if (!p.contextAdjustedCategory) return null;
  const s = p.contextAdjustedCategorySource;
  if (s === "main_block") return "Категория уточнена по основному блоку тренировки";
  if (s === "reinforcement_block") return "Категория уточнена по блоку закрепления";
  if (s === "warmup_block") return "Категория уточнена по разминке";
  if (s === "start_priority") return "Категория уточнена по приоритету старта";
  if (s === "snapshot") return "Категория уточнена по фокусу тренировки";
  return "Категория уточнена по фокусу тренировки";
}

function hintSentiment(p: LiveTrainingDraftProvenance): string | null {
  if (!p.contextAdjustedSentiment) return null;
  if (p.contextAdjustedSentimentSource === "reinforcement_block") {
    return "Позитивный сигнал поддержан блоком закрепления";
  }
  return "Тональность уточнена по контексту тренировки";
}

function hintConfidence(p: LiveTrainingDraftProvenance, hintsSoFar: number): string | null {
  if (hintsSoFar >= 3) return null;
  const { contextUsed, blockContextUsed } = p;
  const before = p.parserConfidenceBeforeContext;
  const after = p.parserConfidenceAfterContext;
  const boosted =
    contextUsed &&
    typeof before === "number" &&
    typeof after === "number" &&
    after > before + CONFIDENCE_BUMP_THRESHOLD;
  if (!boosted) return null;
  if (blockContextUsed === true) {
    return "Структура тренировки усилила уверенность разбора";
  }
  return "Контекст тренировки усилил уверенность разбора";
}

function hintStartPriorityAlignment(p: LiveTrainingDraftProvenance): string | null {
  if (!p.startPriorityUsed) return null;
  if (p.startPriorityPlayerHit) return "Совпадение с приоритетным игроком старта";
  if (p.startPriorityDomainHit) return "Тема совпала с приоритетом старта";
  if (p.startPriorityReinforcementHit) return "Закрепление совпало с приоритетом старта";
  return null;
}

function hintFallback(p: LiveTrainingDraftProvenance, hintsSoFar: number): string | null {
  if (hintsSoFar >= 3) return null;
  if (!p.contextUsed) return null;
  return "Учтён контекст плана тренировки";
}

/**
 * До 3 строк; пустой массив — не показывать блок (как до PHASE 22).
 * `needsReview` не дублируем текстом: предупреждение остаётся на уровне карточки.
 */
export function buildLiveTrainingDraftProvenanceHints(
  _needsReview: boolean,
  provenance: LiveTrainingDraftProvenance | null | undefined
): string[] {
  if (!provenance) return [];

  const hints: string[] = [];

  const hp = hintPlayerMatch(provenance);
  if (hp) hints.push(hp);
  const hc = hintCategory(provenance);
  if (hc) hints.push(hc);
  const hs = hintSentiment(provenance);
  if (hs) hints.push(hs);

  const hconf = hintConfidence(provenance, hints.length);
  if (hconf && hints.length < 3) hints.push(hconf);

  const hsp = hintStartPriorityAlignment(provenance);
  if (hsp && hints.length < 3) hints.push(hsp);

  if (hints.length === 0) {
    const hf = hintFallback(provenance, 0);
    if (hf) hints.push(hf);
  }

  return hints.slice(0, 3);
}

export function countDraftsWithProvenanceHints(
  drafts: Array<{ needsReview: boolean; provenance?: LiveTrainingDraftProvenance | null }>
): number {
  let n = 0;
  for (const d of drafts) {
    if (buildLiveTrainingDraftProvenanceHints(d.needsReview, d.provenance ?? null).length > 0) {
      n += 1;
    }
  }
  return n;
}
