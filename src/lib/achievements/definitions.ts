/**
 * Achievement definitions — rule-based badges.
 * Version 1: definitions in code, evaluated from player data.
 */

export type ConditionType =
  | "gamesPlayed"
  | "goals"
  | "assists"
  | "points"
  | "attendancePercent"
  | "progressMonths"
  | "coachAssigned"
  | "manual";

export type AchievementCategory =
  | "stats"
  | "attendance"
  | "discipline"
  | "progress"
  | "coach"
  | "special";

export interface AchievementDefinition {
  code: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  conditionType: ConditionType;
  conditionValue: number;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    code: "first_goal",
    title: "Первый гол",
    description: "Заброшена первая шайба в сезоне",
    icon: "goal",
    category: "stats",
    conditionType: "goals",
    conditionValue: 1,
  },
  {
    code: "sniper",
    title: "Снайпер",
    description: "Забросить 10 шайб",
    icon: "target",
    category: "stats",
    conditionType: "goals",
    conditionValue: 10,
  },
  {
    code: "team_player",
    title: "Командный игрок",
    description: "Сделать 5 передач",
    icon: "users",
    category: "stats",
    conditionType: "assists",
    conditionValue: 5,
  },
  {
    code: "playmaker",
    title: "Распасовщик",
    description: "Сделать 10 передач",
    icon: "users",
    category: "stats",
    conditionType: "assists",
    conditionValue: 10,
  },
  {
    code: "scorer",
    title: "Бомбардир",
    description: "Набрать 15 очков",
    icon: "star",
    category: "stats",
    conditionType: "points",
    conditionValue: 15,
  },
  {
    code: "consistency",
    title: "Стабильность",
    description: "Сыграть 10 матчей",
    icon: "shield",
    category: "progress",
    conditionType: "gamesPlayed",
    conditionValue: 10,
  },
  {
    code: "iron_discipline",
    title: "Железная дисциплина",
    description: "Посещаемость 90% и выше",
    icon: "shield",
    category: "attendance",
    conditionType: "attendancePercent",
    conditionValue: 90,
  },
  {
    code: "good_progress",
    title: "Хороший прогресс",
    description: "Положительный тренд в 3 месяцах подряд",
    icon: "fire",
    category: "progress",
    conditionType: "progressMonths",
    conditionValue: 3,
  },
];
