// TEMP DEMO MODE WITHOUT DATABASE
// In-memory mock data for demo when PostgreSQL is unavailable.

const DEMO_SCHOOL = {
  id: "demo-school",
  name: "Hockey Academy Moscow",
  address: "Ice Arena, 123 Sport St",
  phone: "+7 495 123-45-67",
  email: "info@hockey-academy.ru",
  _count: { teams: 1, players: 1 },
};

export const MOCK_SCHOOL = DEMO_SCHOOL;

export const MOCK_TEAM = {
  id: "demo-team-1",
  name: "Bears U12",
  ageGroup: "U12",
  coach: "Алексей Иванов",
  season: "2024-25",
  schoolId: "demo-school",
  school: DEMO_SCHOOL,
  _count: { players: 1 },
};

export const MOCK_PLAYER = {
  id: "demo-player-1",
  firstName: "Dmitry",
  lastName: "Petrov",
  birthDate: "2012-05-15T00:00:00.000Z",
  jerseyNumber: 7,
  position: "Нападающий",
  handedness: "Левый",
  height: 165,
  weight: 52,
  photo: null,
  teamId: "demo-team-1",
  schoolId: "demo-school",
  parentId: "demo-parent",
  team: MOCK_TEAM,
  school: DEMO_SCHOOL,
  parent: { id: "demo-parent", name: "Ivan Petrov" },
  coachNotes: "Перспективный игрок. Хорошая скорость и видение льда. Работать над силовым катанием.",
  statistics: [
    { id: "stats-1", season: "2024-25", games: 24, goals: 8, assists: 12, points: 20, pim: 6 },
  ],
};

export const MOCK_TRAINING = {
  id: "demo-training-1",
  title: "Morning Practice",
  startTime: "2025-03-10T09:00:00.000Z",
  endTime: "2025-03-10T10:30:00.000Z",
  location: "Main Rink",
  teamId: "demo-team-1",
  notes: null,
  team: MOCK_TEAM,
};
