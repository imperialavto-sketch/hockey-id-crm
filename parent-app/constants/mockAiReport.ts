export interface StrengthItem {
  id: string;
  title: string;
  explanation: string;
  score: number;
  maxScore: number;
}

export interface GrowthZoneItem {
  id: string;
  title: string;
  problem: string;
  explanation: string;
  score: number;
  maxScore: number;
  action: string;
}

export type RecommendationPriority = "high" | "medium";

export interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  priority: RecommendationPriority;
  expectedEffect: string;
}

export interface SkillScore {
  id: string;
  label: string;
  score: number;
  maxScore: number;
}

export interface AIReportData {
  player: {
    name: string;
    age: number;
    position: string;
    team: string;
  };
  hero: {
    aiRating: number;
    potential: "Low" | "Medium" | "High";
    seasonTrend: number;
    summary: string;
  };
  strengths: StrengthItem[];
  growthZones: GrowthZoneItem[];
  recommendations: RecommendationItem[];
  forecast: {
    currentRating: number;
    potentialRating: number;
    horizonMonths: number;
    strongerTeamChance: "low" | "medium" | "high";
    maxGrowthPotential: string[];
  };
  coachComment: string;
  skills: SkillScore[];
}

import { PLAYER_MARK_GOLYSH } from "./mockPlayerMarkGolysh";
import { DEMO_PLAYER } from "./demoPlayer";

export const MOCK_AI_REPORT: AIReportData = {
  player: {
    name: DEMO_PLAYER.name,
    age: DEMO_PLAYER.age,
    position: DEMO_PLAYER.positionRu,
    team: DEMO_PLAYER.team,
  },
  hero: {
    aiRating: 73,
    potential: "High",
    seasonTrend: 6,
    summary: PLAYER_MARK_GOLYSH.aiCoachReport.summary,
  },
  strengths: [
    {
      id: "s1",
      title: "Катание",
      explanation: "Техника катания и маневренность на льду",
      score: PLAYER_MARK_GOLYSH.attributes.skating,
      maxScore: 100,
    },
    {
      id: "s2",
      title: "Скорость",
      explanation: "Скоростные качества и рывок",
      score: PLAYER_MARK_GOLYSH.attributes.speed,
      maxScore: 100,
    },
    {
      id: "s3",
      title: "Игровое мышление",
      explanation: "Понимание игры и позиционирование",
      score: PLAYER_MARK_GOLYSH.attributes.hockeyIQ,
      maxScore: 100,
    },
    {
      id: "s4",
      title: "Дисциплина",
      explanation: "Регулярность и дисциплинированность на тренировках",
      score: PLAYER_MARK_GOLYSH.attributes.defense,
      maxScore: 100,
    },
  ],
  growthZones: [
    {
      id: "g1",
      title: "Бросок",
      problem: "Техника броска с кистей",
      explanation: "Слабый бросок с игры снижает результативность",
      score: PLAYER_MARK_GOLYSH.attributes.shooting,
      maxScore: 100,
      action: "Улучшить технику броска с кистей",
    },
    {
      id: "g2",
      title: "Силовая борьба",
      explanation: "Недостаток устойчивости и силы корпуса в единоборствах",
      problem: "Потеря шайбы в борьбе",
      score: PLAYER_MARK_GOLYSH.attributes.strength,
      maxScore: 100,
      action: "Упражнения на устойчивость и силу корпуса",
    },
    {
      id: "g3",
      title: "Игра у борта",
      explanation: "Сложности в единоборствах и отборе шайбы",
      problem: "Недостаточная уверенность в борьбе",
      score: PLAYER_MARK_GOLYSH.attributes.balance,
      maxScore: 100,
      action: "Больше эпизодов 1-в-1 на тренировках",
    },
  ],
  recommendations: [
    {
      id: "r1",
      title: "30 часов бросковой подготовки",
      description: "Целенаправленные тренировки техники броска с кистей и щелчка",
      priority: "high",
      expectedEffect: "Рост результативности и уверенности в финише",
    },
    {
      id: "r2",
      title: "2 индивидуальные тренировки в неделю",
      description: "Дополнительные занятия с фокусом на зоны роста",
      priority: "high",
      expectedEffect: "Ускоренный прогресс в слабых сторонах",
    },
    {
      id: "r3",
      title: "Упражнения на баланс и устойчивость",
      description: "Функциональная подготовка корпуса и равновесия",
      priority: "medium",
      expectedEffect: "Улучшение силовой борьбы и игры у борта",
    },
    {
      id: "r4",
      title: "Развитие быстрого принятия решений",
      description: "Игровые эпизоды 1-в-1 и 2-в-2 в тренировочном процессе",
      priority: "medium",
      expectedEffect: "Рост игрового интеллекта и уверенности",
    },
  ],
  forecast: {
    currentRating: 78,
    potentialRating: 83,
    horizonMonths: 4,
    strongerTeamChance: "medium",
    maxGrowthPotential: ["бросок", "силовая борьба"],
  },
  coachComment: PLAYER_MARK_GOLYSH.aiCoachReport.recommendation,
  skills: [
    { id: "sk1", label: "Катание", score: PLAYER_MARK_GOLYSH.attributes.skating, maxScore: 100 },
    { id: "sk2", label: "Скорость", score: PLAYER_MARK_GOLYSH.attributes.speed, maxScore: 100 },
    { id: "sk3", label: "Бросок", score: PLAYER_MARK_GOLYSH.attributes.shooting, maxScore: 100 },
    { id: "sk4", label: "Передачи", score: PLAYER_MARK_GOLYSH.attributes.passing, maxScore: 100 },
    { id: "sk5", label: "Точность", score: PLAYER_MARK_GOLYSH.attributes.accuracy, maxScore: 100 },
    { id: "sk6", label: "Игровое мышление", score: PLAYER_MARK_GOLYSH.attributes.hockeyIQ, maxScore: 100 },
    { id: "sk7", label: "Физика", score: PLAYER_MARK_GOLYSH.attributes.strength, maxScore: 100 },
    { id: "sk8", label: "Защита", score: PLAYER_MARK_GOLYSH.attributes.defense, maxScore: 100 },
  ],
};
