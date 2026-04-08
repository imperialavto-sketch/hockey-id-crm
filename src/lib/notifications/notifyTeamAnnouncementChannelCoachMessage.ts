import { prisma } from "@/lib/prisma";
import {
  chatPushCollapseKey,
  truncateBody,
  truncatePreview,
} from "@/lib/notifications/chatPushDisplay";
import { getParentPushAppBadgeCount } from "@/lib/notifications/pushAppBadgeCount";
import { sendPushToParent } from "@/lib/notifications/sendPush";
import { getParentIdsForTeam } from "@/lib/notifications/getParentsForTeam";

/** Пуш родителям при сообщении тренера/админа в `team_announcement_channel` (без поста ленты). */
export async function notifyTeamAnnouncementChannelCoachMessage(opts: {
  teamId: string;
  conversationId: string;
  coachId: string;
  text: string;
}): Promise<void> {
  const t = opts.text.trim();
  try {
    const parentIds = await getParentIdsForTeam(opts.teamId);
    if (parentIds.length === 0) return;

    const coach = await prisma.coach.findUnique({
      where: { id: opts.coachId },
      select: { firstName: true, lastName: true, displayName: true },
    });
    const senderName =
      coach?.displayName?.trim() ||
      `${coach?.firstName ?? ""} ${coach?.lastName ?? ""}`.trim() ||
      "Тренер";
    const previewText = truncatePreview(t);
    const bodyLine = truncateBody(t) || "Новое объявление";
    const collapseKey = chatPushCollapseKey(opts.conversationId);

    for (const pid of parentIds) {
      const badge = await getParentPushAppBadgeCount(pid);
      void sendPushToParent(pid, {
        type: "team_announcement",
        title: senderName,
        body: bodyLine,
        conversationId: opts.conversationId,
        teamId: opts.teamId,
        senderName,
        previewText: previewText || bodyLine,
        badge,
        collapseId: collapseKey,
        threadIdentifier: collapseKey,
      });
    }
  } catch (e) {
    console.error("[notifyTeamAnnouncementChannelCoachMessage]", e);
  }
}
