import { CRM_DASHBOARD_COPY } from "@/lib/crmDashboardCopy";

export const CRM_RATING_DETAIL_COPY = {
  backRatings: "К рейтингу",
  backDashboard: "К дашборду",
  backPlayers: "К игрокам",
  heroEyebrow: "Рейтинговая запись",
  heroSubtitle: "Детальный профиль игрока с индексом развития, ranking breakdown и оценками тренеров.",
  loadingTitle: "Загружаем рейтинг игрока",
  loadingHint: "Профиль, метрики и связанные секции рейтинга.",
  errorTitle: "Не удалось загрузить рейтинг",
  errorHint: CRM_DASHBOARD_COPY.errorHint,
  retryCta: CRM_DASHBOARD_COPY.retryCta,
  notFoundTitle: "Игрок не найден",
  notFoundHint: "Проверьте ссылку или вернитесь к рейтингу игроков.",
  notFoundBackRatings: "К рейтингу",
  notFoundBackPlayers: "К игрокам",
  rankingKicker: "Рейтинг",
  rankingTitle: "Ranking Breakdown",
  rankingHint: "Позиция игрока в общем рейтинге, команде, позиции и возрастной группе.",
  coachRatingsKicker: "Оценки",
  coachRatingsTitle: "Оценки тренеров",
  coachRatingsHint: "Комментарии тренеров помогают интерпретировать рейтинг и следующий шаг развития.",
} as const;
