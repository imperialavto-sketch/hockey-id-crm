import {
  chatPushCollapseKey,
  resolveParentSenderName,
  truncateBody,
  truncatePreview,
} from "@/lib/notifications/chatPushDisplay";
import { getParentPushAppBadgeCount } from "@/lib/notifications/pushAppBadgeCount";
import { sendPushToParent } from "@/lib/notifications/sendPush";

/** Пуш родителю при сообщении от другого родителя (parent_parent_direct). */
export async function notifyParentPeerMessage(opts: {
  recipientParentId: string;
  conversationId: string;
  teamId: string | null;
  senderParentId: string;
  text: string;
}): Promise<void> {
  const t = opts.text.trim();
  try {
    const senderName = await resolveParentSenderName(opts.senderParentId);
    const previewText = truncatePreview(t);
    const bodyLine = truncateBody(t) || "Сообщение от родителя";
    const badge = await getParentPushAppBadgeCount(opts.recipientParentId);
    const collapseKey = chatPushCollapseKey(opts.conversationId);
    await sendPushToParent(opts.recipientParentId, {
      type: "parent_peer_message",
      title: senderName,
      body: bodyLine,
      conversationId: opts.conversationId,
      teamId: opts.teamId ?? undefined,
      senderName,
      previewText: previewText || bodyLine,
      badge,
      collapseId: collapseKey,
      threadIdentifier: collapseKey,
    });
  } catch (e) {
    console.error("[notifyParentPeerMessage] push failed:", e);
  }
}
