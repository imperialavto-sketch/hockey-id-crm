import type { TeamPost } from "@/types/team";

export const MOCK_TEAM_NAME = "Ак Барс 2013";

export const MOCK_TEAM_POSTS: TeamPost[] = [
  {
    id: "p1",
    type: "announcement",
    author: {
      id: "a1",
      name: "Иван Петров",
      role: "coach",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    text: "Завтра тренировка переносится на 18:30. Причина: ремонт льда.",
    likesCount: 12,
    commentsCount: 5,
    isPinned: true,
    isCoachAnnouncement: true,
  },
  {
    id: "p2",
    type: "match_result",
    author: {
      id: "a1",
      name: "Иван Петров",
      role: "coach",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    text: "Отличная игра! Поздравляю команду с победой.",
    matchResult: {
      teamHome: "Ак Барс 2013",
      teamAway: "Динамо",
      scoreHome: 4,
      scoreAway: 2,
      bestPlayer: "Голыш Марк",
    },
    likesCount: 28,
    commentsCount: 15,
  },
  {
    id: "p3",
    type: "photo",
    author: {
      id: "a2",
      name: "Анна К.",
      role: "parent",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    },
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    text: "Отличная работа на льду сегодня!",
    imageUrl: "https://images.unsplash.com/photo-1542751110-97427bbecf20?w=800&h=600&fit=crop",
    likesCount: 34,
    commentsCount: 8,
  },
  {
    id: "p4",
    type: "reminder",
    author: {
      id: "a1",
      name: "Иван Петров",
      role: "coach",
    },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    text: "Напоминание: суббота — выездная игра. Выезд в 9:00 от арены.",
    event: {
      id: "e1",
      type: "match",
      title: "Выездная игра",
      date: "2026-03-15",
      time: "10:00",
      location: "Ледовый дворец",
    },
    likesCount: 5,
    commentsCount: 12,
  },
  {
    id: "p5",
    type: "team_update",
    author: {
      id: "a1",
      name: "Иван Петров",
      role: "coach",
    },
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    text: "Обновлено расписание на март. Просьба свериться с календарём.",
    likesCount: 18,
    commentsCount: 3,
  },
];
