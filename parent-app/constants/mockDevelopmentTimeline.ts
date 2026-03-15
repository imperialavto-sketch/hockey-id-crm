export type DevelopmentEventType =
  | "achievement"
  | "training"
  | "stats"
  | "coach_note"
  | "video_analysis"
  | "team_change"
  | "medical";

export interface DevelopmentEvent {
  id: string;
  type: DevelopmentEventType;
  year: number;
  date: string;
  title: string;
  description: string;
  badge?: string;
  metric?: string;
}

export interface DevelopmentSummary {
  currentRating: number;
  seasonGrowth: number;
  strength: string;
  growthZone: string;
}

export interface DevelopmentFilters {
  id: string;
  label: string;
  type: DevelopmentEventType | "all";
}

import { PLAYER_MARK_GOLYSH } from "./mockPlayerMarkGolysh";
import { DEMO_PLAYER } from "./demoPlayer";

export const DEVELOPMENT_SUMMARY: DevelopmentSummary = {
  currentRating: DEMO_PLAYER.ovr,
  seasonGrowth: 6,
  strength: PLAYER_MARK_GOLYSH.aiCoachReport.strengths[0] ?? "Катание",
  growthZone: PLAYER_MARK_GOLYSH.aiCoachReport.improvements[0] ?? "Бросок",
};

export const DEVELOPMENT_FILTERS: DevelopmentFilters[] = [
  { id: "all", label: "Все", type: "all" },
  { id: "achievements", label: "Достижения", type: "achievement" },
  { id: "training", label: "Тренировки", type: "training" },
  { id: "analytics", label: "Аналитика", type: "stats" },
  { id: "coach", label: "Комментарии тренера", type: "coach_note" },
];

export const DEVELOPMENT_EVENTS_BY_YEAR: Record<number, DevelopmentEvent[]> = {
  2026: [
    {
      id: "e1",
      type: "stats",
      year: 2026,
      date: "15 мар 2026",
      title: "+3 к скорости",
      description: "Улучшение показателей скоростного катания по результатам тестов",
      metric: "+3",
    },
    {
      id: "e2",
      type: "video_analysis",
      year: 2026,
      date: "10 фев 2026",
      title: "Видеоанализ катания от тренера",
      description: "Разбор техники и рекомендации по улучшению",
    },
    {
      id: "e3",
      type: "achievement",
      year: 2026,
      date: "02 фев 2026",
      title: "Лучший игрок матча",
      description: "Признан MVP в игре против СКА",
      badge: "MVP",
    },
    {
      id: "e4",
      type: "stats",
      year: 2026,
      date: "20 янв 2026",
      title: "Улучшение техники катания на 12%",
      description: "Значительный прогресс в технике выполнения элементов",
      metric: "+12%",
    },
  ],
  2025: [
    {
      id: "e5",
      type: "team_change",
      year: 2025,
      date: "01 сен 2025",
      title: "Переход в новую команду",
      description: "Присоединился к Ak Bars 2013",
      badge: "Новая команда",
    },
    {
      id: "e6",
      type: "training",
      year: 2025,
      date: "15 авг 2025",
      title: "Первая индивидуальная тренировка с частным тренером",
      description: "Начало работы над техникой катания",
    },
    {
      id: "e7",
      type: "stats",
      year: 2025,
      date: "10 июл 2025",
      title: "Рост рейтинга с 72 до 76",
      description: "Стабильный прогресс по итогам сезона",
      metric: "72 → 76",
    },
  ],
  2024: [
    {
      id: "e8",
      type: "achievement",
      year: 2024,
      date: "12 дек 2024",
      title: "Первый официальный турнир",
      description: "Участие в региональном чемпионате",
      badge: "Турнир",
    },
    {
      id: "e9",
      type: "coach_note",
      year: 2024,
      date: "20 ноя 2024",
      title: "Комментарий тренера о хорошем игровом мышлении",
      description: "Тренер отметил развитое понимание игры и позиционирование",
    },
  ],
};
