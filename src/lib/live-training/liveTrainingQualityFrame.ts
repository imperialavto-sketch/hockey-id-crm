/**
 * PHASE 48: агрегированный «кадр качества» тренировки (rule-based, не оценка тренера).
 * Сводит priorityAlignment, незакрытые приоритеты и давление по недавней истории (coach intelligence).
 */

import type { LiveTrainingCoachIntelligenceDto } from "./liveTrainingCoachIntelligence";
import type { LiveTrainingPriorityAlignmentReviewDto } from "./liveTrainingPriorityReviewScorer";

export type LiveTrainingQualityBand = "stable" | "watch" | "recovery";

export type LiveTrainingQualityFrameDto = {
  /**
   * null — нет числового сравнения с планом (skipped / not_applicable); не показывать как успех/провал.
   */
  qualityBand: LiveTrainingQualityBand | null;
  alignmentBand: LiveTrainingPriorityAlignmentReviewDto["alignmentBand"];
  executionPressureMode: LiveTrainingCoachIntelligenceDto["executionPressureMode"];
  unresolvedPriorityCount: number;
  /** Сигналы repeated_* из coach intelligence на окне истории с этой сессией. */
  repeatedGapSignalCount: number;
  explanation: string[];
  computedAt: string;
  evaluationApplied: boolean;
};

function norm(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

/** Есть ли реальный разбор приоритетов старта (PHASE 44). */
export function isPriorityAlignmentActionable(
  par: LiveTrainingPriorityAlignmentReviewDto
): boolean {
  if (!par.evaluationApplied || par.skippedNoTargets) return false;
  if (par.alignmentBand === "not_applicable") return false;
  return (
    par.alignmentBand === "strong" ||
    par.alignmentBand === "partial" ||
    par.alignmentBand === "weak"
  );
}

export function countUnresolvedPriorityTargets(
  par: LiveTrainingPriorityAlignmentReviewDto
): number {
  const pu = Array.isArray(par.uncoveredPlayers) ? par.uncoveredPlayers : [];
  const ud = Array.isArray(par.uncoveredDomains) ? par.uncoveredDomains : [];
  const ur = Array.isArray(par.uncoveredReinforcement) ? par.uncoveredReinforcement : [];
  const players = pu.map(norm).filter(Boolean).length;
  const domains = ud.map(norm).filter(Boolean).length;
  const reinf = ur.map(norm).filter(Boolean).length;
  return players + domains + reinf;
}

export function countRepeatedGapSignals(intel: LiveTrainingCoachIntelligenceDto): number {
  return intel.signals.filter(
    (s) =>
      s.type === "repeated_player_gap" ||
      s.type === "repeated_domain_gap" ||
      s.type === "repeated_reinforcement_gap"
  ).length;
}

/**
 * Собирает кадр качества в момент confirm: текущий alignment + intelligence по [текущий draft|…недавние].
 */
export function buildLiveTrainingQualityFrame(params: {
  priorityAlignment: LiveTrainingPriorityAlignmentReviewDto;
  coachIntelligence: LiveTrainingCoachIntelligenceDto;
}): LiveTrainingQualityFrameDto {
  const { priorityAlignment: par, coachIntelligence: intel } = params;
  const now = new Date().toISOString();
  const actionable = isPriorityAlignmentActionable(par);
  const unresolved = actionable ? countUnresolvedPriorityTargets(par) : 0;
  const repeatedGap = countRepeatedGapSignals(intel);
  const pressure = intel.executionPressureMode;
  const band = par.alignmentBand;

  const explanation: string[] = [];

  if (!actionable) {
    explanation.push(
      "Сравнение с приоритетами старта для этой сессии не выполнялось — обобщённый сигнал качества нейтрален."
    );
    if (pressure === "tighten") {
      explanation.push(
        "По недавним тренировкам планирование может быть плотнее — учтите при следующем старте."
      );
    } else if (pressure === "watch") {
      explanation.push("По недавним стартам есть повод держать фокус в поле зрения.");
    }
    return {
      qualityBand: null,
      alignmentBand: band,
      executionPressureMode: pressure,
      unresolvedPriorityCount: 0,
      repeatedGapSignalCount: repeatedGap,
      explanation,
      computedAt: now,
      evaluationApplied: false,
    };
  }

  /**
   * recovery: слабое закрытие, системное ужатие следующего плана, явные повторяющиеся пробелы или много хвостов.
   */
  const recovery =
    band === "weak" ||
    pressure === "tighten" ||
    repeatedGap >= 2 ||
    unresolved >= 4;

  /**
   * watch: частичное закрытие, режим наблюдения по истории, умеренные хвосты или один повторяющийся пробел в паттерне.
   */
  const watch =
    !recovery &&
    (band === "partial" ||
      pressure === "watch" ||
      unresolved >= 2 ||
      repeatedGap >= 1);

  /**
   * stable: сильное закрытие при малых хвостах и без ужатия; допускается pressure watch при нуле/одном хвосте.
   */
  /** tighten уже попадает в recovery — здесь только сильное закрытие без хвостов и без паттерн-сигналов. */
  const stable =
    !recovery && !watch && band === "strong" && unresolved <= 1 && repeatedGap === 0;

  let qualityBand: LiveTrainingQualityBand | null;
  if (recovery) {
    qualityBand = "recovery";
    if (band === "weak") {
      explanation.push("Закрытие приоритетов старта слабее ожидаемого — имеет смысл упростить следующий фокус.");
    }
    if (pressure === "tighten") {
      explanation.push("По цепочке недавних стартов накопилось давление — следующее планирование может быть плотнее.");
    }
    if (repeatedGap >= 2) {
      explanation.push("Повторяются одни и те же пробелы по приоритетам — стоит сознательно вернуться к ним.");
    }
    if (unresolved >= 4) {
      explanation.push("Много незакрытых целей в этой сессии — перенос на следующий старт будет насыщенным.");
    }
  } else if (watch) {
    qualityBand = "watch";
    if (band === "partial") {
      explanation.push("Приоритеты старта закрыты частично — можно чуть яснее довести темы до сигналов.");
    }
    if (pressure === "watch" || repeatedGap >= 1) {
      explanation.push("По недавней истории есть сигналы держать план внимания.");
    }
    if (unresolved >= 2) {
      explanation.push("Остались отдельные незакрытые ориентиры — заложите время на перенос.");
    }
  } else if (stable) {
    qualityBand = "stable";
    explanation.push("Приоритеты старта в целом закрыты уверенно; следующий план может оставаться спокойным.");
    if (pressure === "watch") {
      explanation.push("История всё же подсказывает мягкий контроль — без срочного ужатия.");
    }
  } else {
    /** Запасной путь для редких комбинаций (например strong + нестандартные флаги): не помечаем как stable. */
    qualityBand = "watch";
    explanation.push("Смешанная картина — разумно чуть сильнее зафиксировать фокус на следующем старте.");
  }

  return {
    qualityBand,
    alignmentBand: band,
    executionPressureMode: pressure,
    unresolvedPriorityCount: unresolved,
    repeatedGapSignalCount: repeatedGap,
    explanation: explanation.slice(0, 4),
    computedAt: now,
    evaluationApplied: true,
  };
}
