/**
 * GET /api/parent/teams/[teamId]/parents
 * Родители команды (только при доступе текущего родителя к команде).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentRole } from "@/lib/api-rbac";
import { canParentAccessTeam } from "@/lib/parent-access";
import { parentParentDedupeKey } from "@/lib/messenger-dedupe";

type ParentAgg = {
  id: string;
  firstName: string;
  lastName: string;
  children: Array<{ firstName: string; lastName: string; relation: string | null }>;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { user, res } = await requireParentRole(req);
  if (res) return res;
  const viewerParentId = user!.parentId!;
  const { teamId } = await params;
  if (!teamId?.trim()) {
    return NextResponse.json({ error: "teamId обязателен" }, { status: 400 });
  }

  const ok = await canParentAccessTeam(viewerParentId, teamId);
  if (!ok) {
    return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true, ageGroup: true },
    });
    if (!team) {
      return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
    }

    const players = await prisma.player.findMany({
      where: { teamId },
      include: {
        parent: { select: { id: true, firstName: true, lastName: true } },
        parentPlayers: {
          include: {
            parent: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    const byParent = new Map<string, ParentAgg>();

    function touchParent(p: { id: string; firstName: string; lastName: string }) {
      if (!byParent.has(p.id)) {
        byParent.set(p.id, {
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          children: [],
        });
      }
      return byParent.get(p.id)!;
    }

    for (const pl of players) {
      const childName = {
        firstName: pl.firstName,
        lastName: pl.lastName,
      };
      if (pl.parentId && pl.parent) {
        const agg = touchParent(pl.parent);
        agg.children.push({
          ...childName,
          relation: null,
        });
      }
      for (const pp of pl.parentPlayers) {
        const agg = touchParent(pp.parent);
        agg.children.push({
          ...childName,
          relation: pp.relation?.trim() || null,
        });
      }
    }

    const memberDraft: Array<{
      parentId: string;
      displayName: string;
      relationLabel: string | null;
      childrenInTeam: Array<{ name: string; relation: string | null }>;
      isSelf: boolean;
      canMessage: boolean;
    }> = [];

    for (const [pid, agg] of byParent) {
      const isSelf = pid === viewerParentId;
      const displayName = `${agg.firstName} ${agg.lastName}`.trim();
      const childrenInTeam = agg.children.map((c) => ({
        name: `${c.firstName} ${c.lastName}`.trim(),
        relation: c.relation,
      }));

      let relationLabel: string | null = null;
      const withRel = agg.children.find((c) => c.relation);
      if (withRel?.relation && childrenInTeam[0]) {
        relationLabel = `${withRel.relation} ${childrenInTeam[0].name.split(/\s+/)[0]}`.trim();
      } else if (childrenInTeam.length === 1) {
        relationLabel = `Родитель ${childrenInTeam[0].name.split(/\s+/)[0]}`;
      }

      memberDraft.push({
        parentId: pid,
        displayName,
        relationLabel,
        childrenInTeam,
        isSelf,
        canMessage: !isSelf,
      });
    }

    const convByDedupe = new Map<string, string>();

    const members = memberDraft.map((m) => ({
      ...m,
      existingConversationId: m.isSelf
        ? null
        : convByDedupe.get(
            parentParentDedupeKey(viewerParentId, m.parentId, teamId)
          ) ?? null,
    }));

    members.sort((a, b) => a.displayName.localeCompare(b.displayName, "ru"));

    return NextResponse.json({
      ok: true,
      team: {
        id: team.id,
        name: team.name,
        ageGroup: team.ageGroup,
      },
      members,
    });
  } catch (e) {
    console.error("GET /api/parent/teams/[teamId]/parents failed:", e);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
