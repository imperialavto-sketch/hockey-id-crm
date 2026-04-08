/**
 * Unified parent inbox: direct coach chat, team announcements surface, Coach Mark AI.
 */

import type { Href } from "expo-router";

import type { ConversationItem } from "@/types/chat";
import { hrefTeamAnnouncements, hrefMessengerThread } from "@/lib/parentMessagingDeepLinks";
import { hrefCoachMarkChat } from "@/lib/coachMarkRoutes";
import type { TeamAnnouncementsInboxSummary } from "@/types/teamAnnouncement";
import { COACH_MARK_ID } from "@/services/chatService";

import { CHAT_INBOX_COPY } from "./parentChatInboxUi";

/** Старая виртуальная строка — только fallback без привязки к команде */
export const INBOX_TEAM_ANNOUNCEMENTS_FALLBACK_ID = "inbox-team-announcements-fallback";

export type ParentInboxKind =
  | "coach_mark_ai"
  | "team_announcements"
  | "direct_parent_coach"
  | "messenger_thread";

export type ParentInboxItem =
  | {
      kind: "coach_mark_ai";
      id: typeof COACH_MARK_ID;
      contextPlayerId?: string;
      contextPlayerName?: string;
      title: string;
      subtitle: string;
      preview: string;
      updatedAt: string;
      showAiBadge: true;
      unreadCount: 0;
    }
  | {
      kind: "team_announcements";
      id: string;
      teamId: string;
      teamName: string;
      anchorPlayerId: string;
      playersLabel: string;
      title: string;
      subtitle: string;
      preview: string;
      updatedAt: string;
      showAiBadge: false;
      unreadCount: number;
    }
  | {
      kind: "direct_parent_coach";
      id: string;
      conversation: ConversationItem;
      title: string;
      subtitle: string;
      preview: string;
      updatedAt: string;
      unreadCount: number;
      showAiBadge: false;
    }
  | {
      kind: "messenger_thread";
      messengerKind: string;
      id: string;
      conversation: ConversationItem;
      title: string;
      subtitle: string;
      preview: string;
      updatedAt: string;
      unreadCount: number;
      showAiBadge: false;
    };

export function buildParentInboxList(
  _userId: string,
  conversations: ConversationItem[],
  teamSummary: TeamAnnouncementsInboxSummary,
  coachMarkCtx?: {
    playerId?: string | null;
    playerName?: string | null;
  } | null
): ParentInboxItem[] {
  const now = new Date().toISOString();

  const coachMark: ParentInboxItem = {
    kind: "coach_mark_ai",
    id: COACH_MARK_ID,
    contextPlayerId: coachMarkCtx?.playerId?.trim() || undefined,
    contextPlayerName: coachMarkCtx?.playerName?.trim() || undefined,
    title: CHAT_INBOX_COPY.coachMarkTitle,
    subtitle:
      coachMarkCtx?.playerName
        ? `${CHAT_INBOX_COPY.coachMarkContextPrefix}: ${coachMarkCtx.playerName}`
        : CHAT_INBOX_COPY.coachMarkContextMissing,
    preview: CHAT_INBOX_COPY.previewEmptyCoachMark,
    updatedAt: now,
    showAiBadge: true,
    unreadCount: 0,
  };

  const teamRows: ParentInboxItem[] =
    teamSummary.status === "ready"
      ? teamSummary.channels.map((ch) => ({
          kind: "team_announcements" as const,
          id: `inbox-team-${ch.teamId}`,
          teamId: ch.teamId,
          teamName: ch.teamName,
          anchorPlayerId: ch.anchorPlayerId,
          playersLabel: ch.playersLabel,
          title: CHAT_INBOX_COPY.teamAnnouncementsTitle,
          subtitle: `${ch.teamName} · ${ch.playersLabel}`,
          preview:
            ch.preview.trim() || CHAT_INBOX_COPY.teamAnnouncementsEmptyPreview,
          updatedAt: ch.updatedAt,
          showAiBadge: false,
          unreadCount: ch.unreadCount,
        }))
      : [
          {
            kind: "team_announcements" as const,
            id: INBOX_TEAM_ANNOUNCEMENTS_FALLBACK_ID,
            teamId: "",
            teamName: "",
            anchorPlayerId: "",
            playersLabel: "",
            title: CHAT_INBOX_COPY.teamAnnouncementsTitle,
            subtitle: CHAT_INBOX_COPY.teamAnnouncementsSubtitleNoChannel,
            preview:
              teamSummary.reason === "error"
                ? CHAT_INBOX_COPY.teamAnnouncementsInboxErrorPreview
                : teamSummary.reason === "no_players" ||
                    teamSummary.reason === "no_team"
                  ? CHAT_INBOX_COPY.teamAnnouncementsNoTeamPreview
                  : CHAT_INBOX_COPY.teamAnnouncementsPreview,
            updatedAt: now,
            showAiBadge: false,
            unreadCount: 0,
          },
        ];

  const direct: ParentInboxItem[] = [];
  for (const c of conversations) {
    const raw = c.lastMessage?.trim();
    const mk =
      c.conversationKind && c.conversationKind.length > 0
        ? c.conversationKind
        : "coach_parent_direct";

    if (mk === "coach_parent_direct") {
      const parts = [
        c.coachName,
        c.playerName,
        c.teamName?.trim() || null,
      ].filter(Boolean);
      direct.push({
        kind: "direct_parent_coach" as const,
        id: c.id,
        conversation: c,
        title: CHAT_INBOX_COPY.directChatRowTitle,
        subtitle: parts.join(" · "),
        preview: raw || CHAT_INBOX_COPY.previewEmptyTrainer,
        updatedAt: c.updatedAt,
        unreadCount:
          typeof c.unreadCount === "number" && c.unreadCount > 0 ? c.unreadCount : 0,
        showAiBadge: false,
      });
      continue;
    }

    const title = c.threadTitle?.trim() || "Сообщения";
    const subtitle = c.threadSubtitle?.trim() || "";
    direct.push({
      kind: "messenger_thread" as const,
      messengerKind: mk,
      id: c.id,
      conversation: c,
      title,
      subtitle,
      preview: raw || "Нет сообщений",
      updatedAt: c.updatedAt,
      unreadCount:
        typeof c.unreadCount === "number" && c.unreadCount > 0 ? c.unreadCount : 0,
      showAiBadge: false,
    });
  }

  return [coachMark, ...teamRows, ...direct];
}

export function parentInboxNavigateHref(item: ParentInboxItem): Href {
  switch (item.kind) {
    case "coach_mark_ai":
      return hrefCoachMarkChat({
        playerId: item.contextPlayerId ?? null,
        playerName: item.contextPlayerName ?? null,
      });
    case "team_announcements":
      if (!item.teamId) {
        return "/team/chat";
      }
      return hrefTeamAnnouncements({
        teamId: item.teamId,
        playerId: item.anchorPlayerId,
      });
    case "direct_parent_coach":
      return hrefMessengerThread(item.conversation.id, {
        playerId: item.conversation.playerId ?? null,
        threadTitle: item.title,
        threadSubtitle: item.subtitle,
        teamId: item.conversation.teamId ?? null,
      });
    case "messenger_thread":
      return hrefMessengerThread(item.conversation.id, {
        playerId: item.conversation.playerId ?? null,
        threadTitle: item.conversation.threadTitle ?? item.title,
        threadSubtitle: item.conversation.threadSubtitle ?? item.subtitle,
        readOnly: item.messengerKind === "team_announcement_channel",
        peerLayout:
          item.messengerKind === "parent_parent_direct" ||
          item.messengerKind === "team_parent_channel",
        announcementChannel: item.messengerKind === "team_announcement_channel",
        teamId: item.conversation.teamId ?? null,
        teamParentChat: item.messengerKind === "team_parent_channel",
      });
  }
}
