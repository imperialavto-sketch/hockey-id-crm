import type { TeamEvent } from "@/types/team";

export const MOCK_TEAM_EVENTS: TeamEvent[] = [
  {
    id: "e1",
    type: "training",
    title: "Тренировка",
    date: "2026-03-15",
    time: "18:30",
    location: "Ледовый дворец",
  },
  {
    id: "e2",
    type: "match",
    title: "Выездная игра",
    date: "2026-03-16",
    time: "10:00",
    location: "Арена «Татнефть»",
  },
  {
    id: "e3",
    type: "tournament",
    title: "Турнир «Золотая шайба»",
    date: "2026-03-22",
  },
];
