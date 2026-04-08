import { appendFeedPostToMessengerAnnouncementChannel } from "@/lib/messenger-feed-announcement-bridge";
import { getParentIdsForTeam } from "@/lib/notifications/getParentsForTeam";
import { sendPushToParents } from "@/lib/notifications/sendPush";
import {
  announcementKindForParent,
  pushTitleForAnnouncementKind,
} from "@/lib/team-announcements-crm";
import { fanOutTeamAnnouncementInAppNotifications } from "@/lib/parent-inapp-notifications";

export type FireTeamAnnouncementPushOpts = {
  /** Текст поста — для дублирования в messenger `team_announcement_channel`. */
  body?: string;
  authorName?: string;
};

/** Публикация объявления: зеркало в messenger, in-app + пуш (не блокирует ответ API). */
export function fireTeamAnnouncementPush(
  teamId: string,
  postType: string,
  postTitle: string,
  postId: string,
  opts?: FireTeamAnnouncementPushOpts
): void {
  const kind = announcementKindForParent(postType);
  void (async () => {
    try {
      let conversationId: string | undefined;
      const bodyText = opts?.body?.trim() ?? "";
      if (bodyText.length > 0) {
        const bridged = await appendFeedPostToMessengerAnnouncementChannel({
          teamId,
          postId,
          title: postTitle,
          body: bodyText,
          authorName: opts?.authorName?.trim() || "Тренер",
        });
        conversationId = bridged?.conversationId;
      }

      await fanOutTeamAnnouncementInAppNotifications({
        teamId,
        postId,
        postType,
        postTitle,
        conversationId,
      });
      const parentIds = await getParentIdsForTeam(teamId);
      if (parentIds.length === 0) return;
      const author = opts?.authorName?.trim();
      await sendPushToParents(parentIds, {
        type: "team_announcement",
        title: pushTitleForAnnouncementKind(kind),
        body: postTitle.slice(0, 200),
        teamId,
        postId,
        ...(conversationId ? { conversationId } : {}),
        ...(author ? { senderName: author } : {}),
        previewText: postTitle.slice(0, 200),
        collapseId: conversationId
          ? `team_ann_${conversationId}`
          : `team_ann_post_${postId}`,
        threadIdentifier: conversationId
          ? `team_ann_${conversationId}`
          : `team_ann_post_${postId}`,
      });
    } catch (e) {
      console.warn("[notifyTeamAnnouncementPush]", e);
    }
  })();
}
