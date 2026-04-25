/**
 * Единая навигация по типу уведомления: in-app список и push (избегаем расхождения с `PushNotificationHandler`).
 *
 * Payload push — строковые поля из `expo-notifications` `content.data`; in-app — `AppNotificationItem`.
 */

import type { AppNotificationItem, AppNotificationType } from "@/types/notification";
import { CHAT_INBOX_COPY } from "@/lib/parentChatInboxUi";
import {
  hrefDirectChat,
  hrefMessengerThread,
  hrefTeamAnnouncements,
} from "@/lib/parentMessagingDeepLinks";
import { hrefArenaCompanionChat } from "@/lib/arenaCompanionRoutes";

/** Минимальный контракт `expo-router` / `useRouter()` для навигации из уведомлений. */
export type ParentNotificationRouter = {
  push: (href: never) => void;
};

type NormalizedNotificationNav = {
  type: AppNotificationType | string;
  conversationId?: string | null;
  playerId?: string | null;
  playerName?: string | null;
  teamId?: string | null;
  postId?: string | null;
  initialMessage?: string | null;
  notifySection?: string | null;
  senderName?: string | null;
  previewText?: string | null;
};

function navigateFromNormalized(
  router: ParentNotificationRouter,
  n: NormalizedNotificationNav
): void {
  const { type } = n;
  switch (type) {
    case "chat_message":
    case "parent_chat_message":
      if (n.conversationId) {
        router.push(
          hrefDirectChat(n.conversationId, n.playerId ?? null) as never
        );
      }
      break;
    case "parent_peer_message":
      if (n.conversationId) {
        router.push(
          hrefMessengerThread(n.conversationId, {
            playerId: n.playerId ?? null,
            threadTitle:
              typeof n.senderName === "string" && n.senderName.trim()
                ? n.senderName
                : undefined,
            threadSubtitle:
              typeof n.previewText === "string" ? n.previewText : undefined,
            peerLayout: true,
            teamId: n.teamId ?? null,
          }) as never
        );
      }
      break;
    case "team_parent_channel_message":
      if (n.conversationId) {
        router.push(
          hrefMessengerThread(n.conversationId, {
            playerId: n.playerId ?? null,
            threadTitle: CHAT_INBOX_COPY.teamParentChannelThreadTitle,
            threadSubtitle:
              typeof n.previewText === "string" && n.previewText.trim()
                ? n.previewText
                : typeof n.senderName === "string" && n.senderName.trim()
                  ? n.senderName
                  : undefined,
            peerLayout: true,
            teamId: n.teamId ?? null,
            teamParentChat: true,
          }) as never
        );
      }
      break;
    case "team_announcement":
      if (n.conversationId?.trim() && n.teamId?.trim()) {
        router.push(
          hrefMessengerThread(n.conversationId, {
            readOnly: true,
            announcementChannel: true,
            teamId: n.teamId,
            threadTitle: "Объявления",
            threadSubtitle:
              typeof n.previewText === "string" && n.previewText.trim()
                ? n.previewText
                : undefined,
          }) as never
        );
      } else {
        router.push(
          hrefTeamAnnouncements({
            teamId: n.teamId ?? null,
            playerId: n.playerId ?? null,
            postId: n.postId ?? null,
          }) as never
        );
      }
      break;
    case "coach_mark_post_training":
      router.push(
        hrefArenaCompanionChat({
          playerId: n.playerId ?? null,
          playerName: n.playerName ?? undefined,
          initialMessage:
            n.initialMessage ??
            "Разбери последнюю тренировку и дай следующий шаг по игроку.",
        }) as never
      );
      break;
    case "schedule_update":
      router.push("/(tabs)/schedule" as never);
      break;
    case "ai_analysis_ready":
      if (n.playerId) {
        router.push(`/player/${n.playerId}/ai-analysis` as never);
      } else {
        router.push("/(tabs)" as never);
      }
      break;
    case "achievement_unlocked":
      if (n.playerId) {
        router.push(`/player/${n.playerId}/achievements` as never);
      } else {
        router.push("/(tabs)" as never);
      }
      break;
    case "training_report_published":
    case "player_progress_update":
      if (n.playerId) {
        const sec = n.notifySection?.trim();
        const q =
          sec && ["engagement", "narrative", "report"].includes(sec)
            ? `?notifySection=${encodeURIComponent(sec)}`
            : "";
        router.push(`/player/${n.playerId}${q}` as never);
      } else {
        router.push("/(tabs)/player" as never);
      }
      break;
    default:
      router.push("/(tabs)" as never);
      break;
  }
}

/** Навигация из экрана списка уведомлений. */
export function navigateFromAppNotificationItem(
  router: ParentNotificationRouter,
  item: AppNotificationItem
): void {
  const d = item.data;
  navigateFromNormalized(router, {
    type: item.type,
    conversationId: d?.conversationId,
    playerId: d?.playerId,
    playerName: d?.playerName,
    teamId: d?.teamId,
    postId: d?.postId,
    initialMessage: d?.initialMessage,
    notifySection: d?.notifySection,
    senderName: d?.senderName,
    previewText:
      typeof d?.previewText === "string" && d.previewText.trim()
        ? d.previewText
        : item.body,
  });
}

/** Навигация по тапу на push (`notification.request.content.data`). */
export function navigateFromPushNotificationData(
  router: ParentNotificationRouter,
  data: Record<string, unknown> | undefined
): void {
  if (!data || typeof data !== "object") return;
  const type = typeof data.type === "string" ? data.type : "";
  if (!type) return;
  const str = (k: string) =>
    typeof data[k] === "string" ? (data[k] as string) : undefined;
  navigateFromNormalized(router, {
    type,
    conversationId: str("conversationId"),
    playerId: str("playerId"),
    playerName: str("playerName"),
    teamId: str("teamId"),
    postId: str("postId"),
    initialMessage: str("initialMessage"),
    notifySection: str("notifySection"),
    senderName: str("senderName"),
    previewText: str("previewText"),
  });
}
