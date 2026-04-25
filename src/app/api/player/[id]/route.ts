import { NextRequest, NextResponse } from "next/server";
import { LiveTrainingSessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";

const MAX_PLAYER_FOLLOW_UP_ACTIONS = 2;
const MAX_ATTENTION_NOTE_LEN = 140;

function clipAttentionNote(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return t.length <= MAX_ATTENTION_NOTE_LEN ? t : `${t.slice(0, MAX_ATTENTION_NOTE_LEN - 1)}…`;
}

type PlayerAttentionSignalDto = {
  level: "watch" | "attention";
  note?: string | null;
};

/**
 * Один сигнал внимания из того же summaryJson, что и follow-up:
 * 1) `sessionMeaningActionTriggersV1` — `attention_required` для игрока;
 * 2) иначе `sessionMeaningProgressV1.players` — `regressed` → attention, `no_change` → watch; `improved` — поля нет.
 */
function extractPlayerAttentionSignalFromDraftSummary(
  summaryJson: unknown,
  playerId: string
): PlayerAttentionSignalDto | undefined {
  const pid = playerId.trim();
  if (!pid) return undefined;
  if (summaryJson == null || typeof summaryJson !== "object" || Array.isArray(summaryJson)) {
    return undefined;
  }
  const root = summaryJson as Record<string, unknown>;

  const triggersRaw = root.sessionMeaningActionTriggersV1;
  if (Array.isArray(triggersRaw)) {
    for (const item of triggersRaw) {
      if (item == null || typeof item !== "object" || Array.isArray(item)) continue;
      const tr = item as Record<string, unknown>;
      const type = typeof tr.type === "string" ? tr.type.trim() : "";
      const target = typeof tr.target === "string" ? tr.target.trim() : "";
      const rowPid = typeof tr.playerId === "string" ? tr.playerId.trim() : "";
      if (type !== "attention_required" || target !== "player" || rowPid !== pid) continue;
      const reason = typeof tr.reason === "string" ? clipAttentionNote(tr.reason) : "";
      return { level: "attention", note: reason || null };
    }
  }

  const progressRaw = root.sessionMeaningProgressV1;
  if (progressRaw != null && typeof progressRaw === "object" && !Array.isArray(progressRaw)) {
    const progPlayers = (progressRaw as Record<string, unknown>).players;
    if (Array.isArray(progPlayers)) {
      for (const p of progPlayers) {
        if (p == null || typeof p !== "object" || Array.isArray(p)) continue;
        const pr = p as Record<string, unknown>;
        const rowId = typeof pr.playerId === "string" ? pr.playerId.trim() : "";
        if (rowId !== pid) continue;
        const progress = typeof pr.progress === "string" ? pr.progress.trim() : "";
        const note = typeof pr.note === "string" ? clipAttentionNote(pr.note) : "";
        if (progress === "regressed") {
          return { level: "attention", note: note || null };
        }
        if (progress === "no_change") {
          return { level: "watch", note: note || null };
        }
        return undefined;
      }
    }
  }

  return undefined;
}

/**
 * Строки `sessionMeaningNextActionsV1.players[].actions` для одного `playerId` (последняя confirmed live команды).
 */
function extractPlayerFollowUpFromDraftSummary(
  summaryJson: unknown,
  playerId: string
): { actions: string[] } | undefined {
  const pid = playerId.trim();
  if (!pid) return undefined;
  if (summaryJson == null || typeof summaryJson !== "object" || Array.isArray(summaryJson)) {
    return undefined;
  }
  const na = (summaryJson as Record<string, unknown>).sessionMeaningNextActionsV1;
  if (na == null || typeof na !== "object" || Array.isArray(na)) {
    return undefined;
  }
  const players = (na as Record<string, unknown>).players;
  if (!Array.isArray(players)) {
    return undefined;
  }
  for (const p of players) {
    if (p == null || typeof p !== "object" || Array.isArray(p)) continue;
    const pr = p as Record<string, unknown>;
    const rowId = typeof pr.playerId === "string" ? pr.playerId.trim() : "";
    if (rowId !== pid) continue;
    const actions: string[] = [];
    const rawActions = pr.actions;
    if (Array.isArray(rawActions)) {
      for (const a of rawActions) {
        if (actions.length >= MAX_PLAYER_FOLLOW_UP_ACTIONS) break;
        const s = typeof a === "string" ? a.trim() : "";
        if (s) actions.push(s);
      }
    }
    if (actions.length === 0) return undefined;
    return { actions };
  }
  return undefined;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "players", "view");
  if (res) return res;
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
    }

    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        team: { include: { coach: true } },
        profile: true,
        passport: true,
        parent: true,
        parentPlayers: { include: { parent: true } },
        parentInvites: { where: { status: "pending" }, orderBy: { createdAt: "desc" } },
        teamHistory: { orderBy: { createdAt: "desc" } },
        stats: { orderBy: { season: "desc" } },
        medical: true,
        skills: true,
        achievements: { orderBy: { year: "desc" } },
        videos: true,
        payments: { orderBy: [{ year: "desc" }, { month: "desc" }] },
        coachRatings: { include: { coach: true } },
      },
    });

    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;

    let playerFollowUp: { actions: string[] } | undefined;
    let playerAttentionSignal: PlayerAttentionSignalDto | undefined;
    const teamId = player.teamId?.trim();
    if (teamId) {
      const latestConfirmedLive = await prisma.liveTrainingSession.findFirst({
        where: { teamId, status: LiveTrainingSessionStatus.confirmed },
        orderBy: [{ confirmedAt: "desc" }, { updatedAt: "desc" }],
        select: { id: true },
      });
      if (latestConfirmedLive?.id) {
        const draft = await prisma.liveTrainingSessionReportDraft.findUnique({
          where: { liveTrainingSessionId: latestConfirmedLive.id },
          select: { summaryJson: true },
        });
        const sj = draft?.summaryJson;
        playerFollowUp = extractPlayerFollowUpFromDraftSummary(sj, id);
        playerAttentionSignal = extractPlayerAttentionSignalFromDraftSummary(sj, id);
      }
    }

    return NextResponse.json({
      ...player,
      ...(playerFollowUp?.actions?.length ? { playerFollowUp } : {}),
      ...(playerAttentionSignal ? { playerAttentionSignal } : {}),
    });
  } catch (error) {
    console.error("GET /api/player/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки игрока",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
