/**
 * Read-only: staff users eligible to link to a school `Coach` (MAIN_COACH / COACH in same school).
 * CRM only; requires coaches create OR edit permission.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbiddenResponse } from "@/lib/api-auth";
import { requireCrmRole } from "@/lib/api-rbac";
import { PERMISSIONS } from "@/lib/rbac";
import {
  COACH_LINK_ELIGIBLE_ROLES,
  resolveSchoolIdFromCoachTeams,
} from "@/lib/coach-linked-user";

export async function GET(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const p = PERMISSIONS[user!.role].coaches;
  if (!p.create && !p.edit) {
    return forbiddenResponse("Недостаточно прав");
  }

  const { searchParams } = new URL(req.url);
  const excludeCoachId = searchParams.get("excludeCoachId")?.trim() || undefined;

  let schoolId: string | null = user!.schoolId ?? null;
  if (!schoolId && excludeCoachId) {
    schoolId = await resolveSchoolIdFromCoachTeams(prisma, excludeCoachId);
  }
  if (!schoolId) {
    return NextResponse.json(
      { error: "Не удалось определить школу для списка учётных записей" },
      { status: 400 }
    );
  }

  const rows = await prisma.user.findMany({
    where: {
      schoolId,
      role: { in: [...COACH_LINK_ELIGIBLE_ROLES] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      teamId: true,
      status: true,
    },
    orderBy: { name: "asc" },
  });

  const taken = await prisma.coach.findMany({
    where: {
      linkedUserId: { not: null },
      ...(excludeCoachId ? { NOT: { id: excludeCoachId } } : {}),
    },
    select: { linkedUserId: true },
  });
  const takenIds = new Set(
    taken.map((t) => t.linkedUserId).filter((x): x is string => !!x)
  );

  const allowedForCurrentCoach = excludeCoachId
    ? await prisma.coach.findUnique({
        where: { id: excludeCoachId },
        select: { linkedUserId: true },
      })
    : null;
  const keepId = allowedForCurrentCoach?.linkedUserId ?? null;

  const filtered = rows.filter(
    (u) => !takenIds.has(u.id) || (keepId && u.id === keepId)
  );

  return NextResponse.json(filtered);
}
