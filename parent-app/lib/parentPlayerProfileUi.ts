/**
 * Copy aligned with chat inbox + coach materials tone (parent player profile).
 */

import { PARENT_FLAGSHIP } from "./parentFlagshipShared";

export const PLAYER_PROFILE_COPY = {
  loadingHint: "Загружаем профиль…",
  materialsLoading: "Загружаем материалы тренера…",
  materialsOpenHint: "Откройте карточку целиком",
  materialsFootHint:
    "После следующих занятий загляните снова — появятся новые материалы.",
  coachMaterialsSubtitle:
    "Отчёты, задачи и личные сообщения тренера после занятий. Сверху — самые свежие.",
  actionsEyebrow: "Действия",
  notFoundTitle: PARENT_FLAGSHIP.playerNotFoundTitle,
  notFoundSubtitle: PARENT_FLAGSHIP.playerNotFoundSubtitle,
  networkErrorTitle: "Профиль не загрузился",
  networkErrorSubtitle: PARENT_FLAGSHIP.networkRetrySubtitle,
  aiAnalysisLoading: "Загружаем анализ…",
} as const;
