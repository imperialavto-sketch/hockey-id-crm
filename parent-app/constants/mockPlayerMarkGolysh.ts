/**
 * Full demo player data: Голыш Марк
 * Main demo player across the Hockey ID mobile app.
 */

export interface PlayerProfile {
  firstName: string;
  lastName: string;
  fullName: string;
  number: number;
  birthYear: number;
  birthDate: string;
  position: string;
  city: string;
  country: string;
  team: string;
  league: string;
  height: number;
  weight: number;
  shoots: string;
}

export interface PlayerStats {
  games: number;
  goals: number;
  assists: number;
  points: number;
  shots: number;
  plusMinus: number;
  penalties: number;
  gameWinningGoals: number;
  avgIceTime: string;
  pointsPerGame: number;
}

export interface PlayerAttributes {
  skating: number;
  speed: number;
  acceleration: number;
  agility: number;
  shooting: number;
  wristShot: number;
  slapShot: number;
  accuracy: number;
  passing: number;
  puckControl: number;
  hockeyIQ: number;
  offense: number;
  defense: number;
  positioning: number;
  stamina: number;
  strength: number;
  balance: number;
}

export interface DevelopmentMonth {
  month: string;
  goals: number;
  assists: number;
  games: number;
}

export interface PlayerRanking {
  dkl3x3ForwardRank: number;
  algaForwardRank: number;
  teamRank: number;
}

export interface AICoachReport {
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendation: string;
}

export interface VideoAnalysisItem {
  id: number;
  title: string;
  date: string;
  insight: string;
}

export interface ScheduleGame {
  id: number;
  type: "game";
  opponent: string;
  date: string;
  time: string;
  arena: string;
}

export interface ScheduleTraining {
  id: number;
  type: "training";
  title: string;
  date: string;
  time: string;
  arena: string;
}

export type ScheduleItem = ScheduleGame | ScheduleTraining;

export interface Achievement {
  title: string;
  season?: string;
  month?: string;
}

export interface PlayerMarkGolysh {
  id: string;
  profile: PlayerProfile;
  stats: PlayerStats;
  attributes: PlayerAttributes;
  development: DevelopmentMonth[];
  ranking: PlayerRanking;
  aiCoachReport: AICoachReport;
  videoAnalysis: VideoAnalysisItem[];
  schedule: ScheduleItem[];
  achievements: Achievement[];
  image: string;
  coachAvatar: string;
}

const CURRENT_YEAR = new Date().getFullYear();

export const PLAYER_MARK_GOLYSH: PlayerMarkGolysh = {
  id: "1",
  image: "https://images.unsplash.com/photo-1515703407324-5f753afd8be8?auto=format&fit=crop&w=800&q=80",
  coachAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",

  profile: {
    firstName: "Марк",
    lastName: "Голыш",
    fullName: "Голыш Марк",
    number: 93,
    birthYear: 2014,
    birthDate: "2014-08-16",
    position: "Forward",
    city: "Казань",
    country: "Россия",
    team: "Hockey ID",
    league: "ДКЛ 3x3",
    height: 120,
    weight: 22,
    shoots: "Left",
  },

  stats: {
    games: 60,
    goals: 22,
    assists: 38,
    points: 60,
    shots: 95,
    plusMinus: 14,
    penalties: 6,
    gameWinningGoals: 5,
    avgIceTime: "10:35",
    pointsPerGame: 1.0,
  },

  attributes: {
    skating: 76,
    speed: 78,
    acceleration: 74,
    agility: 72,
    shooting: 75,
    wristShot: 77,
    slapShot: 68,
    accuracy: 74,
    passing: 79,
    puckControl: 76,
    hockeyIQ: 73,
    offense: 78,
    defense: 65,
    positioning: 70,
    stamina: 72,
    strength: 60,
    balance: 64,
  },

  development: [
    { month: "Сентябрь", goals: 2, assists: 3, games: 6 },
    { month: "Октябрь", goals: 3, assists: 5, games: 8 },
    { month: "Ноябрь", goals: 4, assists: 6, games: 10 },
    { month: "Декабрь", goals: 5, assists: 7, games: 12 },
    { month: "Январь", goals: 4, assists: 6, games: 10 },
    { month: "Февраль", goals: 4, assists: 6, games: 8 },
  ],

  ranking: {
    dkl3x3ForwardRank: 112,
    algaForwardRank: 131,
    teamRank: 3,
  },

  aiCoachReport: {
    summary: "Игрок активно участвует в атаке и хорошо читает игру.",
    strengths: [
      "Хорошее катание",
      "Точный пас",
      "Активность в атаке",
      "Чувство позиции",
    ],
    improvements: [
      "Усилить бросок",
      "Работа у борта",
      "Защитные действия",
    ],
    recommendation: "Рекомендуется развивать силу броска и ускорение.",
  },

  videoAnalysis: [
    {
      id: 1,
      title: "Гол против Спартака",
      date: "2025-01-15",
      insight: "Хороший выход на свободное пространство и быстрый бросок.",
    },
    {
      id: 2,
      title: "Передача на гол",
      date: "2025-02-02",
      insight: "Отличное видение площадки и точный пас.",
    },
  ],

  schedule: [
    {
      id: 1,
      type: "game",
      opponent: "Спартак",
      date: "2025-03-20",
      time: "12:00",
      arena: "Татнефть Арена",
    },
    {
      id: 2,
      type: "training",
      title: "Командная тренировка",
      date: "2025-03-18",
      time: "17:00",
      arena: "Ледовый дворец Казань",
    },
    {
      id: 3,
      type: "game",
      opponent: "Сокол",
      date: "2025-03-25",
      time: "14:30",
      arena: "Татнефть Арена",
    },
  ],

  achievements: [
    { title: "Лучший бомбардир команды", season: "2024/2025" },
    { title: "Игрок месяца", month: "Ноябрь" },
  ],
};

/** Computed age from birth year */
export const PLAYER_AGE = CURRENT_YEAR - PLAYER_MARK_GOLYSH.profile.birthYear;
