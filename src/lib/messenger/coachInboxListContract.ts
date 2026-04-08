/**
 * Единый контракт строки inbox для coach (GET /api/coach/messages, coach-ветка GET /api/chat/conversations).
 * Не меняет send/read/push — только форма list JSON + превью team channel.
 */

import { MESSENGER_KIND, type MessengerKind } from "@/lib/messenger-kinds";

/** Дискриминатор UI/API (явный, без путаницы с legacy kind parent|team). */
export type CoachInboxListRowType = "coach_parent_direct" | "team_parent_channel";

/**
 * Нормализованная строка списка диалогов тренера.
 * Поля optional там, где исторически не везде считались (например unread в CRM-ветке).
 */
export type CoachInboxListRow = {
  id: string;
  type: CoachInboxListRowType;
  conversationKind: MessengerKind;
  title: string;
  /** Готовая строка превью для inbox (team channel: правила sender + text). */
  preview: string;
  lastMessage?: string;
  lastSenderLabel?: string;
  lastMessageAt: string;
  unreadCount?: number;
  teamId?: string;
  playerId?: string;
  /** CRM / legacy list */
  playerName?: string;
  coachId?: string;
  coachName?: string;
  parentId?: string;
  parentName?: string;
  /** Coach-app legacy + метаданные */
  groupName?: string;
  participants?: string[];
  kind?: "parent" | "team";
  /** CRM thread copy (совпадает с parent-app shape частично) */
  threadTitle?: string;
  threadSubtitle?: string;
  teamName?: string;
  /** Алиас для CRM/legacy (то же, что lastMessageAt). */
  updatedAt?: string;
};

/** Для сортировки inbox: сначала lastMessageAt, иначе updatedAt. */
export function coachInboxRowActivityMs(row: Pick<CoachInboxListRow, "lastMessageAt" | "updatedAt">): number {
  const primary = Date.parse(row.lastMessageAt ?? "");
  if (Number.isFinite(primary)) return primary;
  const fallback = Date.parse(row.updatedAt ?? "");
  if (Number.isFinite(fallback)) return fallback;
  return 0;
}

/** Убывание по последней активности, затем стабильно по id. */
export function sortCoachInboxListRowsByActivity<T extends CoachInboxListRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const d = coachInboxRowActivityMs(b) - coachInboxRowActivityMs(a);
    if (d !== 0) return d;
    return a.id.localeCompare(b.id);
  });
}

/** Превью строки списка для TEAM_PARENT_CHANNEL (совпадает с coach-app). */
export function formatTeamParentChannelListPreview(
  lastSenderLabel: string | undefined,
  lastMessage: string | undefined
): string {
  const label = (lastSenderLabel ?? "").trim();
  const body = (lastMessage ?? "").trim();
  if (label && body) return `${label}: ${body}`;
  if (label) return label;
  if (body) return body;
  return "—";
}

export function coachInboxRowTeamParentChannel(input: {
  id: string;
  teamId: string;
  teamName: string;
  lastMessage?: string;
  lastSenderLabel?: string;
  lastMessageAt: string;
  unreadCount?: number;
}): CoachInboxListRow {
  const teamName = input.teamName.trim() || "Команда";
  const title = "Родители команды";
  return {
    id: input.id,
    type: "team_parent_channel",
    conversationKind: MESSENGER_KIND.TEAM_PARENT_CHANNEL,
    title,
    preview: formatTeamParentChannelListPreview(input.lastSenderLabel, input.lastMessage),
    lastMessage: input.lastMessage,
    lastSenderLabel: input.lastSenderLabel,
    lastMessageAt: input.lastMessageAt,
    unreadCount: input.unreadCount ?? 0,
    teamId: input.teamId,
    groupName: teamName,
    participants: [teamName],
    kind: "team",
    threadTitle: title,
    threadSubtitle: teamName,
    teamName,
    playerId: "",
    playerName: "",
    coachId: "",
    coachName: "",
    parentId: "",
    parentName: "",
    updatedAt: input.lastMessageAt,
  };
}

export function coachInboxRowCoachParentDirect(input: {
  id: string;
  playerId: string;
  parentName: string;
  playerName: string;
  coachDisplayName: string;
  coachId: string;
  parentId: string;
  lastMessage?: string;
  lastMessageAt: string;
  unreadCount?: number;
}): CoachInboxListRow {
  const pn = input.parentName.trim();
  const pln = input.playerName.trim();
  const title = `${pn} ↔ ${pln}`;
  const last = (input.lastMessage ?? "").trim();
  return {
    id: input.id,
    type: "coach_parent_direct",
    conversationKind: MESSENGER_KIND.COACH_PARENT_DIRECT,
    title,
    preview: last || "—",
    lastMessage: input.lastMessage,
    lastMessageAt: input.lastMessageAt,
    unreadCount: input.unreadCount,
    playerId: input.playerId,
    playerName: pln,
    coachId: input.coachId,
    coachName: input.coachDisplayName.trim(),
    parentId: input.parentId,
    parentName: pn,
    groupName: pln,
    participants: [pn, input.coachDisplayName.trim()],
    kind: "parent",
    updatedAt: input.lastMessageAt,
  };
}
