import { prisma } from "@/lib/prisma";
import { loadCoachTeamParentChannelSenderLabels } from "@/lib/messenger/coachTeamParentChannelSenderLabel";
import {
  chatPushCollapseKey,
  truncateBody,
  truncatePreview,
} from "@/lib/notifications/chatPushDisplay";
import { getCoachPushAppBadgeCount } from "@/lib/notifications/pushAppBadgeCount";
import { sendPushToCoach } from "@/lib/notifications/sendPush";
import { canParentAccessTeam } from "@/lib/parent-access";

/**
 * Push team coach when a parent posts in team_parent_channel (coach read-only in app).
 */
export async function notifyCoachTeamParentChannelMessage(opts: {
  teamId: string;
  senderParentId: string;
  conversationId: string;
  text: string;
}): Promise<void> {
  const t = opts.text.trim();
  try {
    const team = await prisma.team.findUnique({
      where: { id: opts.teamId },
      select: { coachId: true },
    });
    const coachId = team?.coachId;
    if (!coachId) return;

    const senderOnTeam = await canParentAccessTeam(
      opts.senderParentId,
      opts.teamId
    );
    if (!senderOnTeam) return;

    const senderLabels = await loadCoachTeamParentChannelSenderLabels(
      opts.teamId,
      [opts.senderParentId]
    );
    const senderName =
      senderLabels.get(opts.senderParentId) ?? "Родитель";
    const previewText = truncatePreview(t);
    const bodyLine = truncateBody(t) || "Сообщение родителей в чате команды";
    const badge = await getCoachPushAppBadgeCount(coachId);
    const collapseKey = chatPushCollapseKey(opts.conversationId);
    await sendPushToCoach(coachId, {
      type: "coach_team_parent_channel_message",
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
  } catch (e) {
    console.error("[notifyCoachTeamParentChannelMessage] push failed:", e);
  }
}
