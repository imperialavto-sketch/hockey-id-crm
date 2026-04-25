/**
 * Copy for parent AI analysis screen (`player/[id]/ai-analysis`).
 * Aligned with profile / chat / schedule tone.
 */

import { PARENT_FLAGSHIP } from "./parentFlagshipShared";

export const AI_ANALYSIS_COPY = {
  headerTitle: "AI-анализ",
  loadingHint: "Загружаем AI-анализ…",
  notFoundTitle: PARENT_FLAGSHIP.playerNotFoundTitle,
  notFoundSubtitle: PARENT_FLAGSHIP.playerNotFoundSubtitle,
  loadErrorTitle: "Анализ не загрузился",
  loadErrorSubtitle: PARENT_FLAGSHIP.networkRetrySubtitle,
  emptyScreenTitle: "AI-анализ",
  emptyScreenSub: "Персональный разбор прогресса",
  emptyTitle: "Пока нечего показать",
  emptySub:
    "Когда появятся достаточно данных и наблюдений, здесь будут сильные стороны, зоны роста и рекомендации.",
  heroEyebrow: "Сводка для родителя",
  heroSubtitle:
    "На основе данных и статистики — сильные стороны, зоны роста и шаги для развития.",
  summaryLead: "Главный вывод",
  arenaCompanionCta: "Обсудить выводы в Арене",
} as const;
