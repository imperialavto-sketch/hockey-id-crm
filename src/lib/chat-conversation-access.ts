/**
 * Доступ к ChatConversation: тренер ↔ родитель, родитель ↔ родитель, каналы команды.
 * Всегда заново проверяем членство в команде / игрока (без кэша).
 */

import { prisma } from "@/lib/prisma";
import {
  canParentAccessTeam,
  canParentAccessPlayer,
} from "@/lib/parent-access";
import { MESSENGER_KIND, type MessengerKind } from "@/lib/messenger-kinds";
import { parentsShareTeam } from "@/lib/messenger-parent-rules";
import { parentPeerPairBlockedInTeam } from "@/lib/messenger-peer-block";

type UserLike = {
  role: string;
  parentId?: string | null;
  teamId?: string | null;
  schoolId?: string | null;
};

export type LoadedConversation = {
  id: string;
  kind: string;
  playerId: string | null;
  parentId: string | null;
  coachId: string | null;
  teamContextId: string | null;
  secondParentId: string | null;
};

export async function loadChatConversation(
  conversationId: string
): Promise<LoadedConversation | null> {
  const conv = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      playerId: true,
      parentId: true,
      coachId: true,
    },
  });
  if (!conv) return null;
  return {
    id: conv.id,
    kind: MESSENGER_KIND.COACH_PARENT_DIRECT,
    playerId: conv.playerId,
    parentId: conv.parentId,
    coachId: conv.coachId,
    teamContextId: null,
    secondParentId: null,
  };
}

export async function checkChatConversationAccess(
  conversationId: string,
  user: UserLike
): Promise<{ ok: true } | { ok: false; error: string; httpStatus: 403 | 404 }> {
  const conv = await loadChatConversation(conversationId);

  if (!conv) return { ok: false, error: "Чат не найден", httpStatus: 404 };

  const kind = (conv.kind || MESSENGER_KIND.COACH_PARENT_DIRECT) as MessengerKind;

  if (user.role === "PARENT" && user.parentId) {
    if (kind === MESSENGER_KIND.COACH_PARENT_DIRECT) {
      if (conv.parentId !== user.parentId) {
        return { ok: false, error: "Нет доступа", httpStatus: 403 };
      }
      if (conv.playerId) {
        const okPlayer = await canParentAccessPlayer(
          user.parentId,
          conv.playerId
        );
        if (!okPlayer) {
          return { ok: false, error: "Нет доступа", httpStatus: 403 };
        }
      }
      return { ok: true };
    }

    if (kind === MESSENGER_KIND.PARENT_PARENT_DIRECT) {
      if (!conv.teamContextId || !conv.parentId || !conv.secondParentId) {
        return { ok: false, error: "Нет доступа", httpStatus: 403 };
      }
      const isParticipant =
        conv.parentId === user.parentId || conv.secondParentId === user.parentId;
      if (!isParticipant) {
        return { ok: false, error: "Нет доступа", httpStatus: 403 };
      }
      const share = await parentsShareTeam(
        conv.parentId,
        conv.secondParentId,
        conv.teamContextId
      );
      if (!share) {
        return { ok: false, error: "Нет доступа к команде", httpStatus: 403 };
      }
      const blocked = await parentPeerPairBlockedInTeam(
        conv.teamContextId,
        conv.parentId,
        conv.secondParentId
      );
      if (blocked) {
        return { ok: false, error: "Переписка недоступна", httpStatus: 403 };
      }
      return { ok: true };
    }

    if (
      kind === MESSENGER_KIND.TEAM_PARENT_CHANNEL ||
      kind === MESSENGER_KIND.TEAM_ANNOUNCEMENT_CHANNEL
    ) {
      if (!conv.teamContextId) {
        return { ok: false, error: "Нет доступа", httpStatus: 403 };
      }
      const okTeam = await canParentAccessTeam(user.parentId, conv.teamContextId);
      if (!okTeam) {
        return { ok: false, error: "Нет доступа к команде", httpStatus: 403 };
      }
      return { ok: true };
    }

    return { ok: false, error: "Нет доступа", httpStatus: 403 };
  }

  if (
    (user.role === "COACH" || user.role === "MAIN_COACH") &&
    user.teamId
  ) {
    if (kind === MESSENGER_KIND.TEAM_ANNOUNCEMENT_CHANNEL) {
      if (conv.teamContextId !== user.teamId) {
        return { ok: false, error: "Нет доступа", httpStatus: 403 };
      }
      const team = await prisma.team.findUnique({
        where: { id: user.teamId },
        select: { coachId: true },
      });
      if (!team?.coachId) {
        return { ok: false, error: "Нет доступа", httpStatus: 403 };
      }
      return { ok: true };
    }
    if (
      kind === MESSENGER_KIND.TEAM_PARENT_CHANNEL &&
      conv.teamContextId === user.teamId
    ) {
      const team = await prisma.team.findUnique({
        where: { id: user.teamId },
        select: { coachId: true },
      });
      if (!team?.coachId) {
        return { ok: false, error: "Нет доступа", httpStatus: 403 };
      }
      return { ok: true };
    }
    if (kind !== MESSENGER_KIND.COACH_PARENT_DIRECT) {
      return { ok: false, error: "Нет доступа", httpStatus: 403 };
    }
    if (!conv.coachId) {
      return { ok: false, error: "Нет доступа", httpStatus: 403 };
    }
    const team = await prisma.team.findUnique({
      where: { id: user.teamId },
      select: { coachId: true },
    });
    if (team?.coachId !== conv.coachId) {
      return { ok: false, error: "Нет доступа", httpStatus: 403 };
    }
    return { ok: true };
  }

  if (user.role === "SCHOOL_ADMIN" || user.role === "SCHOOL_MANAGER") {
    // team_parent_channel: админ/менеджер не открывают общий чат родителей на этом этапе.
    if (kind === MESSENGER_KIND.COACH_PARENT_DIRECT) {
      return { ok: true };
    }
    if (
      kind === MESSENGER_KIND.TEAM_ANNOUNCEMENT_CHANNEL &&
      conv.teamContextId
    ) {
      const team = await prisma.team.findUnique({
        where: { id: conv.teamContextId },
        select: { schoolId: true },
      });
      if (!team || team.schoolId !== user.schoolId) {
        return { ok: false, error: "Нет доступа", httpStatus: 403 };
      }
      return { ok: true };
    }
    return { ok: false, error: "Нет доступа", httpStatus: 403 };
  }

  return { ok: false, error: "Нет доступа", httpStatus: 403 };
}
