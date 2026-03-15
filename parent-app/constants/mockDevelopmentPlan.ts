export interface WeeklyPlanItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface WeekPlan {
  id: string;
  weekNumber: number;
  title: string;
  items: WeeklyPlanItem[];
}

export interface DrillCard {
  id: string;
  title: string;
  description: string;
  duration: string;
  focus: string;
}

export interface DevelopmentPlanData {
  playerName: string;
  summary: {
    monthlyGoal: string;
    keyGrowthZone: string;
    predictedResult: string;
  };
  monthlyGoals: string[];
  weeklyPlan: WeekPlan[];
  drills: DrillCard[];
  progress: {
    completedSessions: number;
    totalSessions: number;
    completedItems: string[];
  };
}

export const MOCK_DEVELOPMENT_PLAN: DevelopmentPlanData = {
  playerName: "Голыш Марк",
  summary: {
    monthlyGoal: "Улучшить бросок и устойчивость",
    keyGrowthZone: "Бросок, силовая борьба",
    predictedResult: "+3–5 к рейтингу за месяц",
  },
  monthlyGoals: [
    "Улучшить технику броска",
    "Повысить устойчивость и баланс",
    "Улучшить игру 1-в-1",
  ],
  weeklyPlan: [
    {
      id: "w1",
      weekNumber: 1,
      title: "Неделя 1",
      items: [
        { id: "w1-1", text: "2 тренировки на бросок", completed: true },
        { id: "w1-2", text: "1 тренировка на баланс", completed: true },
        { id: "w1-3", text: "15 мин stickhandling ежедневно", completed: false },
      ],
    },
    {
      id: "w2",
      weekNumber: 2,
      title: "Неделя 2",
      items: [
        { id: "w2-1", text: "2 тренировки на бросок", completed: false },
        { id: "w2-2", text: "2 тренировки на баланс и устойчивость", completed: false },
        { id: "w2-3", text: "Эпизоды 1-в-1 на льду (3 раза)", completed: false },
      ],
    },
    {
      id: "w3",
      weekNumber: 3,
      title: "Неделя 3",
      items: [
        { id: "w3-1", text: "3 тренировки на бросок", completed: false },
        { id: "w3-2", text: "1 силовая тренировка", completed: false },
        { id: "w3-3", text: "15 мин stickhandling + щелчок ежедневно", completed: false },
      ],
    },
    {
      id: "w4",
      weekNumber: 4,
      title: "Неделя 4",
      items: [
        { id: "w4-1", text: "Контрольная тренировка 1-в-1", completed: false },
        { id: "w4-2", text: "2 бросковые сессии", completed: false },
        { id: "w4-3", text: "Оценка прогресса с тренером", completed: false },
      ],
    },
  ],
  drills: [
    {
      id: "d1",
      title: "Бросок с кистей",
      description: "Тренировка точности и силы броска с разных точек. Фокус на завершающем движении кистями.",
      duration: "15 мин",
      focus: "Бросок",
    },
    {
      id: "d2",
      title: "Баланс на одной ноге",
      description: "Удержание баланса на коньках на одной ноге с мячом. Укрепление корпуса.",
      duration: "10 мин",
      focus: "Устойчивость",
    },
    {
      id: "d3",
      title: "1-в-1 у борта",
      description: "Единоборство за шайбу у борта. Работа корпусом и защита шайбы.",
      duration: "20 мин",
      focus: "Игра 1-в-1",
    },
    {
      id: "d4",
      title: "Stickhandling с препятствиями",
      description: "Ведение шайбы между конусами на скорости. Улучшение контроля.",
      duration: "15 мин",
      focus: "Техника",
    },
  ],
  progress: {
    completedSessions: 3,
    totalSessions: 12,
    completedItems: ["w1-1", "w1-2"],
  },
};
