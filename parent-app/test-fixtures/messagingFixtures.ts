/**
 * Стабильные данные для Storybook и Jest-снапшотов (фиксированные id / время).
 * `STORYBOOK_FIXTURE_PLAYER_ID` совпадает с демо-игроком `PLAYER_MARK_GOLYSH.id`.
 */

import type { ConversationItem } from "@/types/chat";
import type { AppNotificationItem } from "@/types/notification";
import type { ParentInboxItem } from "@/lib/parentInboxModel";
import { PLAYER_MARK_GOLYSH } from "@/constants/mockPlayerMarkGolysh";

/** Совпадает с `COACH_MARK_ID` в `chatService` — без импорта сервиса (Jest / Storybook). */
const COACH_MARK_INBOX_ID = "coach-mark" as const;

/** Фиксированный playerId для снапшотов и stories (не менять без обновления снапшотов). */
export const STORYBOOK_FIXTURE_PLAYER_ID = PLAYER_MARK_GOLYSH.id;

const FIXTURE_ISO = "2026-03-15T12:00:00.000Z";

export const storybookConversationCoach: ConversationItem = {
  id: "c_storybook_coach_1",
  playerId: STORYBOOK_FIXTURE_PLAYER_ID,
  playerName: PLAYER_MARK_GOLYSH.profile.fullName,
  teamName: PLAYER_MARK_GOLYSH.profile.team,
  coachId: "coach_story_1",
  coachName: "Тренер Иванов",
  parentId: "parent_story_1",
  lastMessage: "До встречи на тренировке!",
  updatedAt: FIXTURE_ISO,
  unreadCount: 3,
};

export const storybookInboxDirectUnread: ParentInboxItem = {
  kind: "direct_parent_coach",
  id: storybookConversationCoach.id,
  conversation: storybookConversationCoach,
  title: "Чат с тренером",
  subtitle: `${storybookConversationCoach.coachName} · ${storybookConversationCoach.playerName}`,
  preview: storybookConversationCoach.lastMessage ?? "",
  updatedAt: FIXTURE_ISO,
  unreadCount: 3,
  showAiBadge: false,
};

export const storybookInboxCoachMark: ParentInboxItem = {
  kind: "coach_mark_ai",
  id: COACH_MARK_INBOX_ID,
  contextPlayerId: STORYBOOK_FIXTURE_PLAYER_ID,
  contextPlayerName: PLAYER_MARK_GOLYSH.profile.fullName,
  title: "Арена · AI",
  subtitle: `Контекст: ${PLAYER_MARK_GOLYSH.profile.fullName}`,
  preview: "Спросите о прогрессе или плане на неделю",
  updatedAt: FIXTURE_ISO,
  showAiBadge: true,
  unreadCount: 0,
};

export const storybookInboxTeam: ParentInboxItem = {
  kind: "team_announcements",
  id: "inbox-team-story-1",
  teamId: "team_story_1",
  teamName: "Hockey ID U10",
  anchorPlayerId: STORYBOOK_FIXTURE_PLAYER_ID,
  playersLabel: PLAYER_MARK_GOLYSH.profile.fullName,
  title: "Объявления команды",
  subtitle: `Hockey ID U10 · ${PLAYER_MARK_GOLYSH.profile.fullName}`,
  preview: "Завтра сбор в 17:30",
  updatedAt: FIXTURE_ISO,
  showAiBadge: false,
  unreadCount: 1,
};

export const storybookNotificationChat: AppNotificationItem = {
  id: "notif_story_chat_1",
  type: "chat_message",
  title: "Новое сообщение",
  body: "Тренер написал вам в личном чате",
  createdAt: FIXTURE_ISO,
  isRead: false,
  data: {
    conversationId: storybookConversationCoach.id,
    playerId: STORYBOOK_FIXTURE_PLAYER_ID,
  },
};

export const storybookNotificationRead: AppNotificationItem = {
  ...storybookNotificationChat,
  id: "notif_story_read_1",
  isRead: true,
};
