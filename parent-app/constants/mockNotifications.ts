import type { AppNotificationItem } from "@/types/notification";

const now = Date.now();
const hour = 60 * 60 * 1000;
const day = 24 * hour;

export const MOCK_NOTIFICATIONS: AppNotificationItem[] = [
  {
    id: "n1",
    type: "chat_message",
    title: "Новое сообщение от тренера",
    body: "Иван Петров: Завтра тренировка переносится на 18:30",
    createdAt: new Date(now - 2 * hour).toISOString(),
    isRead: false,
    data: { conversationId: "c1" },
  },
  {
    id: "n2",
    type: "schedule_update",
    title: "Изменение расписания",
    body: "Тренировка 12 марта перенесена с 17:00 на 18:30",
    createdAt: new Date(now - 5 * hour).toISOString(),
    isRead: false,
    data: { playerId: "p1" },
  },
  {
    id: "n3",
    type: "ai_analysis_ready",
    title: "AI-анализ готов",
    body: "Видео-анализ для Марка завершён. Посмотрите рекомендации.",
    createdAt: new Date(now - 1 * day).toISOString(),
    isRead: true,
    data: { playerId: "p1" },
  },
  {
    id: "n4",
    type: "achievement_unlocked",
    title: "Новое достижение",
    body: "Марк получил значок «Первая шайба»",
    createdAt: new Date(now - 2 * day).toISOString(),
    isRead: true,
    data: { playerId: "p1", achievementCode: "first_goal" },
  },
  {
    id: "n5",
    type: "general",
    title: "Обновление приложения",
    body: "Доступна новая версия Hockey ID с улучшениями",
    createdAt: new Date(now - 3 * day).toISOString(),
    isRead: true,
  },
];
