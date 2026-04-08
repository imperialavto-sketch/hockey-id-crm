import {
  chatPushCollapseKey,
  resolveParentSenderName,
  truncateBody,
  truncatePreview,
} from "@/lib/notifications/chatPushDisplay";
import { getCoachPushAppBadgeCount } from "@/lib/notifications/pushAppBadgeCount";
import { sendPushToCoach } from "@/lib/notifications/sendPush";

/**
 * Remote push when a parent sends a chat message — coach mobile (Expo) devices.
 */
export async function notifyCoachNewParentMessage(opts: {
  coachId: string;
  parentId: string;
  conversationId: string;
  playerId: string;
  teamId: string | null;
  text: string;
}): Promise<void> {
  const t = opts.text.trim();
  try {
    const senderName = await resolveParentSenderName(opts.parentId);
    const previewText = truncatePreview(t);
    const bodyLine = truncateBody(t) || "Новое сообщение в чате";
    const badge = await getCoachPushAppBadgeCount(opts.coachId);
    const collapseKey = chatPushCollapseKey(opts.conversationId);
    await sendPushToCoach(opts.coachId, {
      type: "parent_chat_message",
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
    console.error("[notifyCoachNewParentMessage] push failed:", e);
  }
}
