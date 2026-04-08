import { upsertParentChatMessageNotification } from "@/lib/parent-inapp-notifications";
import {
  chatPushCollapseKey,
  resolveCoachSenderName,
  truncateBody,
  truncatePreview,
} from "@/lib/notifications/chatPushDisplay";
import { getParentPushAppBadgeCount } from "@/lib/notifications/pushAppBadgeCount";
import { sendPushToParent } from "@/lib/notifications/sendPush";

/**
 * Пуш + in-app при новом сообщении тренера родителю.
 * Не дублирует строки при серии сообщений: обновляет одно непрочитанное по conversationId.
 */
export async function notifyParentNewCoachMessage(opts: {
  parentId: string;
  coachId: string;
  conversationId: string;
  playerId: string;
  teamId: string | null;
  text: string;
}): Promise<void> {
  const t = opts.text.trim();
  const preview = truncatePreview(t);

  try {
    await upsertParentChatMessageNotification({
      parentId: opts.parentId,
      conversationId: opts.conversationId,
      playerId: opts.playerId,
      teamId: opts.teamId,
      preview,
    });
  } catch (e) {
    console.error("[notifyParentNewCoachMessage] in-app failed:", e);
  }

  try {
    const senderName = await resolveCoachSenderName(opts.coachId);
    const previewText = truncatePreview(t);
    const bodyLine = truncateBody(t) || "Новое сообщение";
    const badge = await getParentPushAppBadgeCount(opts.parentId);
    const collapseKey = chatPushCollapseKey(opts.conversationId);
    await sendPushToParent(opts.parentId, {
      type: "chat_message",
      title: senderName,
      body: bodyLine,
      conversationId: opts.conversationId,
      playerId: opts.playerId,
      teamId: opts.teamId ?? undefined,
      senderName,
      previewText: previewText || bodyLine,
      badge,
      collapseId: collapseKey,
      threadIdentifier: collapseKey,
    });
  } catch (e) {
    console.error("[notifyParentNewCoachMessage] push failed:", e);
  }
}
