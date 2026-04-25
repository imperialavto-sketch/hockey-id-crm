/**
 * Shared copy + time formatting for parent chat inbox (tab + stack list).
 * No API or navigation logic.
 */

import { ARENA_COMPANION_CHAT_ID } from "@/services/chatService";
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
    "Откройте профиль игрока и нажмите «Чат с тренером». Арена — вверху списка.",
  stackEmptySubtitle:
    "Откройте профиль игрока и нажмите «Чат с тренером»",
  heroTitle: "Чаты",
  heroSub: "Арена и тренеры — одна лента диалогов",
  arenaContextLine: "AI-компаньон Арена",
  previewEmptyArenaAi:
    "Задайте вопрос Арене о прогрессе или тренировках — ответ появится в чате",
  previewEmptyTrainer: "Напишите первым — ответ появится здесь",
  arenaTitle: "Арена",
  arenaContextPrefix: "Контекст",
  arenaContextMissing: "Выберите игрока в чате — подстроим ответы",
  teamAnnouncementsTitle: "Команда",
  teamAnnouncementsEmptyPreview: "Объявления и новости команды",
  teamAnnouncementsSubtitleNoChannel: "Канал команды",
  teamAnnouncementsInboxErrorPreview: "Не удалось загрузить объявления",
  teamAnnouncementsNoTeamPreview: "Команда появится после назначения",
  teamAnnouncementsPreview: "Новости и объявления тренера",
  directChatRowTitle: "Диалог с тренером",
  teamParentChannelThreadTitle: "Чат команды",
} as const;

export function formatConversationListTime(iso: string): string {
  if (!iso || typeof iso !== "string" || iso.trim() === "") return "—";
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

export function isArenaCompanionInboxItem(item: ConversationItem): boolean {
  return item.id === ARENA_COMPANION_CHAT_ID;
}

/** @deprecated Use isArenaCompanionInboxItem */
export function isCoachMarkInboxItem(item: ConversationItem): boolean {
  return isArenaCompanionInboxItem(item);
}

export function conversationPreviewLine(
  item: ConversationItem,
  isArenaCompanionAi: boolean
): string {
  const raw = item.lastMessage?.trim();
  if (raw) return raw;
  return isArenaCompanionAi
    ? CHAT_INBOX_COPY.previewEmptyArenaAi
    : CHAT_INBOX_COPY.previewEmptyTrainer;
}
