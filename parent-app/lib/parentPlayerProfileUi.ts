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
  childDevelopmentTitle: "Развитие",
  childDevelopmentSubtitle:
    "Коротко и спокойно — без оценок и сравнения с другими.",
  engagementTitle: "Рядом с тренировками",
  engagementSubtitle: "Поддержка и ориентиры после занятий.",
  progressNarrativeTitle: "Как складывается прогресс",
  progressNarrativeSubtitle:
    "Связная история по последним тренировкам — без баллов и гонки.",
  progressNarrativeContinuingLabel: "Продолжаем наращивать",
  progressNarrativeStabilizingLabel: "Стабильная зона",
  coachMaterialsSubtitle:
    "Отчёты, задачи и личные сообщения тренера после занятий. Сверху — самые свежие.",
  actionsEyebrow: "Действия",
  notFoundTitle: PARENT_FLAGSHIP.playerNotFoundTitle,
  notFoundSubtitle: PARENT_FLAGSHIP.playerNotFoundSubtitle,
  networkErrorTitle: "Профиль не загрузился",
  networkErrorSubtitle: PARENT_FLAGSHIP.networkRetrySubtitle,
  aiAnalysisLoading: "Загружаем анализ…",
} as const;
