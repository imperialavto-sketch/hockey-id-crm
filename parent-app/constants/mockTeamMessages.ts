import type { TeamMessage } from "@/types/team";

export const MOCK_TEAM_MESSAGES: TeamMessage[] = [
  {
    id: "m1",
    authorId: "u1",
    authorName: "Анна К.",
    authorRole: "parent",
    text: "Кто едет завтра на игру?",
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    type: "text",
  },
  {
    id: "m2",
    authorId: "u2",
    authorName: "Дмитрий С.",
    authorRole: "parent",
    text: "Мы едем, есть два места в машине.",
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    type: "text",
  },
  {
    id: "m3",
    authorId: "c1",
    authorName: "Иван Петров",
    authorRole: "coach",
    text: "Просьба приехать за 40 минут до начала игры.",
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    type: "text",
  },
  {
    id: "m4",
    authorId: "u3",
    authorName: "Елена В.",
    authorRole: "parent",
    text: "Спасибо за информацию!",
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    type: "text",
  },
];
