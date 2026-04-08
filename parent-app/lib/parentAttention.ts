/**
 * Слой «внимания» для родителя: отдельно сообщения (чаты + объявления команд)
 * и отдельно карточки уведомлений — без одной общей цифры «всё сразу».
 */

import type { ParentInboxItem } from "@/lib/parentInboxModel";

export type MessagesAttention = {
  /** Есть ли непрочитанное в личных чатах или в каналах объявлений (по данным инбокса). */
  hasUnread: boolean;
  /** Сумма счётчиков по строкам (для отладки и редких подписей; в UI чаще — точка). */
  unreadTotal: number;
};

/**
 * Coach Mark в инбоксе не учитываем (unread там всегда 0).
 * Учитываем каналы объявлений по командам, личные диалоги с тренером и новые messenger-треды.
 */
export function computeMessagesAttention(
  items: ParentInboxItem[]
): MessagesAttention {
  let unreadTotal = 0;
  for (const it of items) {
    if (
      it.kind === "team_announcements" ||
      it.kind === "direct_parent_coach" ||
      it.kind === "messenger_thread"
    ) {
      const n = it.unreadCount;
      if (typeof n === "number" && n > 0) {
        unreadTotal += n;
      }
    }
  }
  return {
    hasUnread: unreadTotal > 0,
    unreadTotal,
  };
}
