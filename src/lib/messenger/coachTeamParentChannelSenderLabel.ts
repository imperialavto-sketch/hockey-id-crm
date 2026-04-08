import { prisma } from "@/lib/prisma";

/**
 * Единая подпись отправителя для coach-side чтения `team_parent_channel`
 * (поток + push). Не используется в parent-facing API.
 */
export function buildCoachTeamParentChannelSenderLabel(
  parent: { firstName: string; lastName: string } | null,
  childFirstNamesOnTeam: string[]
): string {
  if (parent) {
    const full = `${parent.firstName} ${parent.lastName}`.trim();
    if (full) return full;
  }
  const names = [
    ...new Set(
      childFirstNamesOnTeam
        .map((n) => n.trim())
        .filter((n) => n.length > 0)
    ),
  ].sort((a, b) => a.localeCompare(b, "ru"));
  if (names.length === 0) return "Родитель";
  if (names.length === 1) return `Родитель · ${names[0]}`;
  if (names.length === 2) return `Родитель · ${names[0]}, ${names[1]}`;
  return `Родитель · ${names[0]}, ${names[1]}…`;
}

export async function loadCoachTeamParentChannelSenderLabels(
  teamId: string,
  parentIds: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(parentIds.filter(Boolean))];
  const out = new Map<string, string>();
  if (unique.length === 0) return out;

  const [parents, players] = await Promise.all([
    prisma.parent.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.player.findMany({
      where: {
        teamId,
        parentPlayers: { some: { parentId: { in: unique } } },
      },
      select: {
        firstName: true,
        parentPlayers: {
          where: { parentId: { in: unique } },
          select: { parentId: true },
        },
      },
    }),
  ]);

  const parentById = new Map(parents.map((p) => [p.id, p]));
  const kidsByParent = new Map<string, string[]>();
  for (const pid of unique) kidsByParent.set(pid, []);

  for (const pl of players) {
    const fn = pl.firstName?.trim() ?? "";
    if (!fn) continue;
    for (const pp of pl.parentPlayers) {
      const bucket = kidsByParent.get(pp.parentId);
      if (bucket) bucket.push(fn);
    }
  }

  for (const pid of unique) {
    const row = parentById.get(pid) ?? null;
    out.set(
      pid,
      buildCoachTeamParentChannelSenderLabel(row, kidsByParent.get(pid) ?? [])
    );
  }
  return out;
}

type TeamParentChannelListLastMessage = {
  senderType: string;
  senderId: string;
} | null;

/**
 * Coach inbox/list: label for the latest message in TEAM_PARENT_CHANNEL rows.
 * Same rules as GET /api/coach/messages/[id] thread mapping (parent → loadCoach…, coach → «Тренер», else «Участник»).
 * Batches parent lookups per team (no N+1 per row).
 */
export async function resolveCoachTeamParentChannelRowLastSenderLabels(
  rows: Array<{
    conversationId: string;
    teamContextId: string | null;
    lastMessage: TeamParentChannelListLastMessage | undefined;
  }>
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const byTeam = new Map<string, Set<string>>();

  for (const row of rows) {
    const m = row.lastMessage;
    if (!m) continue;
    const st = (m.senderType ?? "").toLowerCase();
    if (st === "coach") {
      out.set(row.conversationId, "Тренер");
    } else if (st === "parent") {
      const tid = row.teamContextId;
      if (tid && m.senderId) {
        if (!byTeam.has(tid)) byTeam.set(tid, new Set());
        byTeam.get(tid)!.add(m.senderId);
      } else {
        out.set(row.conversationId, "Родитель");
      }
    } else {
      out.set(row.conversationId, "Участник");
    }
  }

  const compositeToLabel = new Map<string, string>();
  for (const [teamId, parentIds] of byTeam) {
    const labels = await loadCoachTeamParentChannelSenderLabels(teamId, [
      ...parentIds,
    ]);
    for (const pid of parentIds) {
      compositeToLabel.set(`${teamId}:${pid}`, labels.get(pid) ?? "Родитель");
    }
  }

  for (const row of rows) {
    const m = row.lastMessage;
    if (!m) continue;
    if ((m.senderType ?? "").toLowerCase() !== "parent") continue;
    const tid = row.teamContextId;
    if (!tid || !m.senderId) continue;
    out.set(
      row.conversationId,
      compositeToLabel.get(`${tid}:${m.senderId}`) ?? "Родитель"
    );
  }

  return out;
}
