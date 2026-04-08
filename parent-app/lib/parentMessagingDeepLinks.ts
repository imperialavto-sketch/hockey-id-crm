/**
 * Единые deep links для сообщений (контекст нескольких команд).
 */

import type { Href } from "expo-router";

export function hrefTeamAnnouncements(opts?: {
  teamId?: string | null;
  playerId?: string | null;
  postId?: string | null;
}): Href {
  const q = new URLSearchParams();
  const t = opts?.teamId?.trim();
  const p = opts?.playerId?.trim();
  const postId = opts?.postId?.trim();
  if (t) q.set("teamId", t);
  if (p) q.set("playerId", p);
  if (postId) q.set("postId", postId);
  const s = q.toString();
  return `/team/chat${s ? `?${s}` : ""}` as Href;
}

export function hrefDirectChat(
  conversationId: string,
  playerId?: string | null
): Href {
  const q = new URLSearchParams();
  const p = playerId?.trim();
  if (p) q.set("playerId", p);
  const s = q.toString();
  return `/chat/${encodeURIComponent(conversationId)}${s ? `?${s}` : ""}` as Href;
}

/** Тред messenger: заголовки и режим только чтения (канал объявлений). */
export function hrefMessengerThread(
  conversationId: string,
  opts?: {
    playerId?: string | null;
    threadTitle?: string | null;
    threadSubtitle?: string | null;
    readOnly?: boolean;
    /** Родитель vs родитель / чат команды: свои сообщения справа, чужие родители слева. */
    peerLayout?: boolean;
    /** Для блокировки / контекста модерации в клиенте. */
    teamId?: string | null;
    /** Канал объявлений messenger: стиль карточек и пустое состояние. */
    announcementChannel?: boolean;
    /** Общий чат родителей команды — локальный mute в UI. */
    teamParentChat?: boolean;
  }
): Href {
  const q = new URLSearchParams();
  const p = opts?.playerId?.trim();
  if (p) q.set("playerId", p);
  const tt = opts?.threadTitle?.trim();
  if (tt) q.set("threadTitle", tt);
  const ts = opts?.threadSubtitle?.trim();
  if (ts) q.set("threadSubtitle", ts);
  if (opts?.readOnly) q.set("readOnly", "1");
  if (opts?.peerLayout) q.set("threadLayout", "peer");
  const tm = opts?.teamId?.trim();
  if (tm) q.set("teamId", tm);
  if (opts?.announcementChannel) q.set("channelKind", "announcements");
  if (opts?.teamParentChat) q.set("teamParentChat", "1");
  const s = q.toString();
  return `/chat/${encodeURIComponent(conversationId)}${s ? `?${s}` : ""}` as Href;
}
