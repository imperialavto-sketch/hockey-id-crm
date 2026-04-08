/**
 * Список переписок родителя для GET /api/chat/conversations (все типы messenger).
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MESSENGER_KIND } from "@/lib/messenger-kinds";
import { getOrCreateTeamParentChannel } from "@/lib/messenger-service";
import { getParentActiveTeamIds } from "@/lib/parent-team-ids";
import { canParentAccessPlayer } from "@/lib/parent-access";

function coachDisplayName(c: {
  displayName: string | null;
  firstName: string;
  lastName: string;
}): string {
  const dn = c.displayName?.trim();
  if (dn) return dn;
  return `${c.firstName} ${c.lastName}`.trim();
}

export type ParentConversationListRow = {
  id: string;
  conversationKind: string;
  threadTitle: string;
  threadSubtitle: string;
  playerId: string | null;
  playerName: string;
  teamName: string | null;
  /** Контекст команды для deep links (каналы, peer, команда игрока). */
  teamId: string | null;
  coachId: string | null;
  coachName: string;
  parentId: string | null;
  lastMessage?: string;
  updatedAt: string;
  unreadCount: number;
};

export async function listParentMessengerConversationRows(
  parentId: string
): Promise<ParentConversationListRow[]> {
  const teamIds = await getParentActiveTeamIds(parentId);
  if (teamIds.length === 0 && parentId) {
    /* только coach↔parent без командных каналов */
  }

  /** Один канал на команду: создаём строку до первого сообщения, чтобы инбокс стабильно показывал чат. */
  for (const tid of teamIds) {
    try {
      await getOrCreateTeamParentChannel(tid);
    } catch (e) {
      console.warn(
        "[listParentMessengerConversationRows] getOrCreateTeamParentChannel failed",
        tid,
        e
      );
    }
  }

  /** Схема `ChatConversation`: coach↔parent по `parentId` (+ игрок); полей peer/team-channel нет. */
  const or: Prisma.ChatConversationWhereInput[] = [];
  if (parentId) {
    or.push({ parentId });
  }
  const where: Prisma.ChatConversationWhereInput = or.length ? { OR: or } : {};

  if (!or.length) {
    console.warn("[chat.conversations] EMPTY_OR_GUARD", {
      userId: undefined,
      parentId,
      teamId: undefined,
      teamIds,
    });
    return [];
  }

  const list = await prisma.chatConversation.findMany({
    where,
    include: {
      player: {
        select: {
          firstName: true,
          lastName: true,
          teamId: true,
          team: { select: { name: true } },
        },
      },
      coach: {
        select: { firstName: true, lastName: true, displayName: true },
      },
      parent: { select: { firstName: true, lastName: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { text: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const filtered: typeof list = [];
  for (const c of list) {
    if (c.playerId) {
      const okPlayer = await canParentAccessPlayer(parentId, c.playerId);
      if (!okPlayer) continue;
    }
    filtered.push(c);
  }

  const coachParentIds = filtered.map((c) => c.id);

  const unreadCoach = new Map<string, number>();
  if (coachParentIds.length > 0) {
    const g = await prisma.chatMessage.groupBy({
      by: ["conversationId"],
      where: {
        conversationId: { in: coachParentIds },
        senderType: "coach",
        readAt: null,
      },
      _count: { _all: true },
    });
    for (const row of g) {
      unreadCoach.set(row.conversationId, row._count._all);
    }
  }

  const rows: ParentConversationListRow[] = [];

  const kind = MESSENGER_KIND.COACH_PARENT_DIRECT;
  for (const c of filtered) {
    const lastMessage = c.messages[0]?.text;
    const unread = unreadCoach.get(c.id) ?? 0;

    if (!c.player || !c.coach || !c.parent) continue;
    const playerName = `${c.player.firstName} ${c.player.lastName}`.trim();
    const coachName = coachDisplayName(c.coach);
    const teamName = c.player.team?.name?.trim() || null;
    rows.push({
      id: c.id,
      conversationKind: kind,
      threadTitle: coachName,
      threadSubtitle: [playerName, teamName].filter(Boolean).join(" · "),
      playerId: c.playerId,
      playerName,
      teamName,
      teamId: c.player?.teamId ?? null,
      coachId: c.coachId,
      coachName,
      parentId: c.parentId,
      lastMessage,
      updatedAt: c.updatedAt.toISOString(),
      unreadCount: unread,
    });
  }

  return rows;
}

/** Все непрочитанные входящие по messenger-диалогам родителя (для badge на пушах). */
export async function countParentMessengerUnread(parentId: string): Promise<number> {
  const rows = await listParentMessengerConversationRows(parentId);
  return rows.reduce((sum, r) => sum + (r.unreadCount > 0 ? r.unreadCount : 0), 0);
}
