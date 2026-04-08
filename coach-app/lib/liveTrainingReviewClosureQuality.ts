/**
 * PHASE 39: качество закрытия review / мягкий handoff в аналитику (rule-based, без score, без блокировки confirm).
 */

import type { LiveTrainingConfirmReadiness } from "@/lib/liveTrainingConfirmConfidence";
import type { LiveTrainingReviewAccelerationCounts } from "@/lib/liveTrainingReviewAcceleration";
import type { LiveTrainingObservationDraft, LiveTrainingReviewSummary } from "@/types/liveTraining";

export type LiveTrainingReviewClosureQualityLevel = "strong" | "acceptable" | "fragile";

export type LiveTrainingReviewClosureQuality = {
  quality: LiveTrainingReviewClosureQualityLevel;
  label: string;
  lines: string[];
  /**
   * Мягкая подсказка для UX (не блокирует кнопку подтверждения).
   * false при «хрупкой» передаче или отсутствии данных к подтверждению.
   */
  handoffReady: boolean;
};

export type LiveTrainingReviewClosureProgress = {
  touchedDraftIds: ReadonlySet<string>;
  quickAppliedDraftIds: ReadonlySet<string>;
};

function needsReviewDrafts(drafts: LiveTrainingObservationDraft[]): LiveTrainingObservationDraft[] {
  return drafts.filter((d) => d.needsReview);
}

function unassignedDrafts(drafts: LiveTrainingObservationDraft[]): LiveTrainingObservationDraft[] {
  return drafts.filter((d) => d.playerId == null);
}

function fragileBySessionState(params: {
  toConfirm: number;
  readiness: LiveTrainingConfirmReadiness;
  needsReview: number;
  unassigned: number;
}): boolean {
  const { toConfirm, readiness, needsReview, unassigned } = params;
  if (toConfirm <= 0) return true;
  if (readiness === "blocked") return true;
  const sum = needsReview + unassigned;
  if (needsReview >= 2 || unassigned >= 2) return true;
  if (needsReview >= 1 && unassigned >= 1) return true;
  if (sum >= 3) return true;
  return false;
}

function allNeedReviewTouched(drafts: LiveTrainingObservationDraft[], touched: ReadonlySet<string>): boolean {
  const list = needsReviewDrafts(drafts);
  if (list.length === 0) return true;
  return list.every((d) => touched.has(d.id));
}

function allUnassignedTouched(drafts: LiveTrainingObservationDraft[], touched: ReadonlySet<string>): boolean {
  const list = unassignedDrafts(drafts);
  if (list.length === 0) return true;
  return list.every((d) => touched.has(d.id));
}

/**
 * Данные: сводка сессии, acceleration, готовность confirm (PHASE 26), черновики, локальный прогресс (PHASE 38).
 */
export function buildLiveTrainingReviewClosureQuality(params: {
  reviewSummary: LiveTrainingReviewSummary;
  accelerationCounts: LiveTrainingReviewAccelerationCounts;
  confirmReadiness: LiveTrainingConfirmReadiness;
  drafts: LiveTrainingObservationDraft[];
  progress?: LiveTrainingReviewClosureProgress | null;
}): LiveTrainingReviewClosureQuality {
  const { reviewSummary, accelerationCounts, confirmReadiness, drafts, progress } = params;
  const toConfirm = reviewSummary.toConfirmCount;
  const needsReview = reviewSummary.needsReviewCount;
  const unassigned = reviewSummary.unassignedCount;
  const { quickFixCount, broadCategoryCount, totalCount } = accelerationCounts;
  const touched = progress?.touchedDraftIds ?? new Set<string>();
  const quickApplied = progress?.quickAppliedDraftIds ?? new Set<string>();
  const passEngaged = touched.size + quickApplied.size > 0;

  if (fragileBySessionState({ toConfirm, readiness: confirmReadiness, needsReview, unassigned })) {
    const lines: string[] = [];
    if (toConfirm <= 0) {
      lines.push("Сейчас нечего фиксировать в аналитике — список к подтверждению пуст.");
    } else if (confirmReadiness === "blocked") {
      lines.push("Есть заметные спорные места: лучше уточнить наблюдения перед финальной передачей.");
    } else {
      lines.push("Часть разбора всё ещё опирается на спорные или непривязанные наблюдения.");
    }
    if (needsReview > 0 || unassigned > 0) {
      lines.push("После подтверждения эти сигналы попадут в аналитику в текущем виде.");
    }
    lines.push("При желании ещё раз пройдите фильтры «Требует проверки» и «Без игрока».");
    return {
      quality: "fragile",
      label: "Передача в аналитику пока хрупкая",
      lines: lines.slice(0, 3),
      handoffReady: false,
    };
  }

  const singleRisk = needsReview === 1 || unassigned === 1;
  const riskTouched =
    (needsReview === 0 || allNeedReviewTouched(drafts, touched)) &&
    (unassigned === 0 || allUnassignedTouched(drafts, touched));

  const softSpots =
    broadCategoryCount >= 2 ||
    quickFixCount >= 2 ||
    (broadCategoryCount >= 1 && quickFixCount >= 1);

  const strongCandidate =
    confirmReadiness === "ready" &&
    !softSpots &&
    (riskTouched || (needsReview === 0 && unassigned === 0));

  if (strongCandidate) {
    const lines: string[] = [
      "Наблюдения готовы к передаче в аналитику.",
      "Спорных очередей и массовых «общих» формулировок не осталось.",
    ];
    if (passEngaged) {
      lines.push("В этом проходе вы уже просматривали или уточняли карточки — это повышает уверенность.");
    } else if (totalCount <= 4) {
      lines.push("Небольшой список — быстрый контрольный проход всё равно полезен.");
    }
    return {
      quality: "strong",
      label: "Проверка закрыта уверенно",
      lines: lines.slice(0, 3),
      handoffReady: true,
    };
  }

  const lines: string[] = [];
  if (needsReview === 1 && unassigned === 0) {
    lines.push("Одно наблюдение с пометкой проверки — после просмотра данные можно передавать в аналитику.");
  } else if (unassigned === 1 && needsReview === 0) {
    lines.push("Одно наблюдение без игрока — при желании привяжите к составу; иначе сигнал уйдёт как есть.");
  } else {
    lines.push("Часть наблюдений ещё можно уточнить, но основной разбор уже собран.");
  }
  if (broadCategoryCount >= 2) {
    lines.push("В аналитике останется несколько широких категорий «общее» — при желании сузьте их.");
  } else if (broadCategoryCount === 1) {
    lines.push("Одна карточка с широкой категорией — при желании уточните формулировку.");
  }
  if (quickFixCount >= 2) {
    lines.push("Есть несколько быстрых правок по разбору — они необязательны, но улучшат детализацию.");
  } else if (quickFixCount === 1) {
    lines.push("На одной карточке доступна быстрая правка — можно применить до подтверждения.");
  }
  if (singleRisk && !riskTouched) {
    lines.push("Загляните в чувствительную карточку в этом проходе — так спокойнее перед передачей.");
  }
  if (lines.length < 2) {
    lines.push("Данные можно передать в аналитику; смысл сигналов уже зафиксирован.");
  }

  return {
    quality: "acceptable",
    label: "Можно передавать в аналитику",
    lines: lines.slice(0, 3),
    handoffReady: true,
  };
}
