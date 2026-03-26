/**
 * GET /api/coach/parent-drafts
 * Coach-scoped list of parent drafts (new + legacy).
 * Auth: Bearer (requireCrmRole).
 * Data sources:
 * 1) ParentDraft (standalone create endpoint)
 * 2) CoachSessionParentDraft (legacy synced session drafts)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessiblePlayerIds } from "@/lib/data-scope";

export async function GET(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  try {
    const accessibleIds = await getAccessiblePlayerIds(user!, prisma);
    const playerIdSet =
      accessibleIds === null ? null : new Set<string>(accessibleIds);

    const standaloneDrafts = await prisma.parentDraft.findMany({
      where: {
        coachId: user!.id,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const standalonePlayerIds = Array.from(
      new Set(
        standaloneDrafts
          .map((d) => d.playerId)
          .filter((x): x is string => typeof x === "string" && x.length > 0)
      )
    );
    const standalonePlayers =
      standalonePlayerIds.length > 0
        ? await prisma.player.findMany({
            where: { id: { in: standalonePlayerIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const playerNameById = new Map(
      standalonePlayers.map((p) => [
        p.id,
        [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "Игрок",
      ])
    );

    const sessions = await prisma.coachSession.findMany({
      where: {
        coachUserId: user!.id,
        endedAt: { not: null },
        parentDrafts: { some: {} },
      },
      include: { parentDrafts: true },
      orderBy: { endedAt: "desc" },
      take: 50,
    });

    const seenLegacyByPlayer = new Set<string>();
    const items: Array<{
      id: string;
      source: "parent_draft" | "session_draft";
      playerId: string | null;
      playerName: string;
      text: string;
      shortSummary?: string;
      messagePreview?: string;
      updatedAt?: string;
      ready?: boolean;
      voiceNoteId?: string | null;
    }> = [];

    for (const d of standaloneDrafts) {
      const pid = d.playerId ?? null;
      if (pid && playerIdSet !== null && !playerIdSet.has(pid)) continue;
      const text = d.text?.trim() || "—";
      items.push({
        id: d.id,
        source: "parent_draft",
        playerId: pid,
        playerName: (pid ? playerNameById.get(pid) : null) || "Игрок",
        text,
        shortSummary: undefined,
        messagePreview: text,
        updatedAt: d.createdAt.toISOString(),
        ready: true,
        voiceNoteId: d.voiceNoteId ?? null,
      });
    }

    for (const s of sessions) {
      for (const d of s.parentDrafts) {
        if (playerIdSet !== null && !playerIdSet.has(d.playerId)) continue;
        if (seenLegacyByPlayer.has(d.playerId)) continue;
        seenLegacyByPlayer.add(d.playerId);

        const preview =
          d.parentMessage?.trim() || d.headline?.trim() || "—";

        items.push({
          id: d.id,
          source: "session_draft",
          playerId: d.playerId,
          playerName: d.playerName || "Игрок",
          text: preview,
          shortSummary: d.headline?.trim() || undefined,
          messagePreview: preview,
          updatedAt: s.endedAt?.toISOString() ?? s.startedAt.toISOString(),
          ready: true,
        });
      }
    }

    items.sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/coach/parent-drafts failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки черновиков",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
