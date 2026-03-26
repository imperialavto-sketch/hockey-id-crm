/**
 * Shared copy + time formatting for parent chat inbox (tab + stack list).
 * No API or navigation logic.
 */

import { COACH_MARK_ID } from "@/services/chatService";
import type { ConversationItem } from "@/types/chat";
import { PARENT_FLAGSHIP } from "./parentFlagshipShared";

export const CHAT_INBOX_COPY = {
  authTitle: "Нужен вход",
  authSubtitle:
    "Авторизуйтесь, чтобы писать в чат и видеть ответы тренера",
  loadErrorTitle: "Чаты не загрузились",
  loadErrorSubtitle: PARENT_FLAGSHIP.networkRetrySubtitle,
  loadingHint: "Загружаем диалоги…",
  emptyTitle: "Пока нет чатов с тренером",
  emptySubtitle:
    "Откройте профиль игрока и нажмите «Чат с тренером». Coach Mark — вверху списка.",
  stackEmptySubtitle:
    "Откройте профиль игрока и нажмите «Чат с тренером»",
  heroTitle: "Чаты",
  heroSub: "Coach Mark и тренеры — одна лента диалогов",
  coachMarkContextLine: "AI-помощник по хоккею",
  previewEmptyCoachMark:
    "Задайте вопрос о прогрессе или тренировках — ответ появится в чате",
  previewEmptyTrainer: "Напишите первым — ответ появится здесь",
} as const;

export function formatConversationListTime(iso: string): string {
  if (!iso || iso.trim() === "") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function isCoachMarkInboxItem(item: ConversationItem): boolean {
  return item.id === COACH_MARK_ID;
}

export function conversationPreviewLine(
  item: ConversationItem,
  isCoachMark: boolean
): string {
  const raw = item.lastMessage?.trim();
  if (raw) return raw;
  return isCoachMark
    ? CHAT_INBOX_COPY.previewEmptyCoachMark
    : CHAT_INBOX_COPY.previewEmptyTrainer;
}
