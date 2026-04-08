/**
 * Safe MVP: validate linking CRM school `Coach` ↔ `User` via existing `Coach.linkedUserId`.
 * No schema changes; does not touch live-training.
 */

import type { PrismaClient } from "@prisma/client";
import type { ApiUser } from "@/lib/api-auth";
import type { UserRole } from "@/lib/rbac";

export const COACH_LINK_ELIGIBLE_ROLES: readonly UserRole[] = [
  "MAIN_COACH",
  "COACH",
] as const;

export function isCoachLinkEligibleRole(role: string): boolean {
  return (COACH_LINK_ELIGIBLE_ROLES as readonly string[]).includes(role);
}

/**
 * School scope for validating the target User: actor's school, or first team on the payload (admin without schoolId).
 */
export async function resolveSchoolIdForCoachMutation(
  prisma: PrismaClient,
  actor: ApiUser,
  teamIds?: string[]
): Promise<string | null> {
  if (actor.schoolId) return actor.schoolId;
  if (teamIds && teamIds.length > 0) {
    const team = await prisma.team.findFirst({
      where: { id: { in: teamIds } },
      select: { schoolId: true },
    });
    return team?.schoolId ?? null;
  }
  return null;
}

/** School scope for an existing coach card (teams already in DB). */
export async function resolveSchoolIdFromCoachTeams(
  prisma: PrismaClient,
  coachId: string
): Promise<string | null> {
  const team = await prisma.team.findFirst({
    where: { coachId },
    select: { schoolId: true },
  });
  return team?.schoolId ?? null;
}

export type ValidateLinkedUserResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export async function validateLinkedUserForSchoolCoach(
  prisma: PrismaClient,
  params: { linkedUserId: string; schoolId: string }
): Promise<ValidateLinkedUserResult> {
  const u = await prisma.user.findUnique({
    where: { id: params.linkedUserId },
    select: { id: true, schoolId: true, role: true },
  });
  if (!u) return { ok: false, error: "Пользователь не найден", status: 404 };
  if (u.schoolId !== params.schoolId) {
    return { ok: false, error: "Учётная запись принадлежит другой школе", status: 400 };
  }
  if (!isCoachLinkEligibleRole(u.role)) {
    return {
      ok: false,
      error: "Можно привязать только пользователя с ролью MAIN_COACH или COACH",
      status: 400,
    };
  }
  return { ok: true };
}

export async function findCoachOccupyingLinkedUser(
  prisma: PrismaClient,
  linkedUserId: string,
  options?: { exceptCoachId?: string }
) {
  return prisma.coach.findFirst({
    where: {
      linkedUserId,
      ...(options?.exceptCoachId
        ? { NOT: { id: options.exceptCoachId } }
        : {}),
    },
    select: { id: true, isMarketplaceIndependent: true },
  });
}
