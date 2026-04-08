/**
 * Shared access check for coach conversation routes (messages detail, ai-signals, etc.).
 */

import { prisma } from "@/lib/prisma";

export type CoachConversationAccessResult =
  | { ok: true }
  | { ok: false; error: string; status: 403 | 404 };

export async function checkCoachConversationAccess(
  conversationId: string,
  user: { role: string; teamId?: string | null }
): Promise<CoachConversationAccessResult> {
  const conv = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      coachId: true,
    },
  });
  if (!conv) return { ok: false, error: "Чат не найден", status: 404 };

  if (!conv.coachId) {
    return { ok: false, error: "Нет доступа", status: 403 };
  }

  if ((user.role === "COACH" || user.role === "MAIN_COACH") && user.teamId) {
    const team = await prisma.team.findUnique({
      where: { id: user.teamId },
      select: { coachId: true },
    });
    if (team?.coachId !== conv.coachId) {
      return { ok: false, error: "Нет доступа", status: 403 };
    }
    return { ok: true };
  }

  if (user.role === "SCHOOL_ADMIN" || user.role === "SCHOOL_MANAGER") {
    return { ok: true };
  }

  return { ok: false, error: "Нет доступа", status: 403 };
}
