import type { ApiUser } from "@/lib/api-auth";
import { checkPlayerAccess, type PlayerWithTeam } from "@/lib/data-scope";
import { prisma } from "@/lib/prisma";
import { getParentPlayerById } from "@/lib/parent-players";

export type ArenaPlayerAccessResult =
  | { ok: true }
  | { ok: false; kind: "not_found" | "forbidden" };

/**
 * Родитель — только через getParentPlayerById (`ParentPlayer` SSOT; не `Player.parentId`).
 * Staff — через canAccessPlayer / школа или команда.
 */
export async function assertParentOrStaffCanAccessPlayer(
  user: ApiUser,
  playerId: string
): Promise<ArenaPlayerAccessResult> {
  const pid = playerId.trim();
  if (!pid) return { ok: false, kind: "not_found" };

  if (user.role === "PARENT") {
    if (!user.parentId) return { ok: false, kind: "forbidden" };
    const p = await getParentPlayerById(user.parentId, pid);
    return p ? { ok: true } : { ok: false, kind: "not_found" };
  }

  const staffRoles: ApiUser["role"][] = [
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "MAIN_COACH",
    "COACH",
  ];
  if (!staffRoles.includes(user.role)) {
    return { ok: false, kind: "forbidden" };
  }

  const player = await prisma.player.findUnique({
    where: { id: pid },
    select: {
      id: true,
      teamId: true,
      team: { select: { schoolId: true } },
    },
  });
  if (!player) return { ok: false, kind: "not_found" };

  const denied = checkPlayerAccess(user, player as PlayerWithTeam);
  if (denied) return { ok: false, kind: "forbidden" };
  return { ok: true };
}
