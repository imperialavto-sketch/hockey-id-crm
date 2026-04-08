import { prisma } from "@/lib/prisma";

/**
 * Подзаголовок для parent_parent_direct: «Команда · мама Марк» по `ParentPlayer` (PHASE 2).
 */
export async function buildParentPeerThreadSubtitle(
  otherParentId: string,
  teamId: string
): Promise<string> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { name: true },
  });
  const teamName = team?.name?.trim() || "Команда";

  const players = await prisma.player.findMany({
    where: {
      teamId,
      parentPlayers: { some: { parentId: otherParentId } },
    },
    select: {
      firstName: true,
      lastName: true,
      parentPlayers: {
        where: { parentId: otherParentId },
        select: { relation: true },
        take: 1,
      },
    },
  });

  const chunks: string[] = [];
  for (const pl of players) {
    const childShort = pl.firstName.trim();
    const relFromLink = pl.parentPlayers[0]?.relation?.trim();
    if (relFromLink) {
      chunks.push(`${relFromLink} ${childShort}`.trim());
    } else {
      chunks.push(`${childShort} ${pl.lastName}`.trim());
    }
  }

  const ctx = chunks.length > 0 ? chunks.join(", ") : "Родитель";
  return `${teamName} · ${ctx}`;
}
