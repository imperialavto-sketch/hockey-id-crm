/**
 * GET /api/trainings/[id]/behavioral-suggestions
 * Подсказки для structured `behavioral.*` (focus / discipline 1–5) из **live-training**
 * (`LiveTrainingPlayerSignal`, domain behavior × keys attention | discipline).
 * Контракт совместим с прежним voice-behavioral endpoint (schedule coach-app).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, unauthorizedResponse } from "@/lib/api-auth";
import { canUserAccessSessionTeam } from "@/lib/training-session-helpers";
import { getPlayersForTrainingSession } from "@/lib/training-session-attendance";
import { canParentAccessPlayer } from "@/lib/parent-access";
import { PERMISSIONS, type UserRole } from "@/lib/rbac";

const BEHAVIOR_DOMAIN = "behavior";
const KEY_ATTENTION = "attention";
const KEY_DISCIPLINE = "discipline";

const CRM_TRAINING_VIEW_ROLES = new Set<UserRole>([
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "MAIN_COACH",
  "COACH",
]);

type SignalSlice = {
  playerId: string;
  metricKey: string;
  signalDirection: string;
  signalStrength: number;
  createdAt: Date;
};

type AxisExplainability = {
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  totalSignals: number;
  lastSignalAt: string;
};

function explainBehavioralAxis(
  signals: Array<{ signalDirection: string; createdAt: Date }>
): AxisExplainability | null {
  if (signals.length === 0) return null;
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  let lastMs = 0;
  for (const s of signals) {
    const d = String(s.signalDirection);
    if (d === "positive") positiveCount += 1;
    else if (d === "negative") negativeCount += 1;
    else neutralCount += 1;
    const t = s.createdAt.getTime();
    if (t > lastMs) lastMs = t;
  }
  return {
    positiveCount,
    negativeCount,
    neutralCount,
    totalSignals: signals.length,
    lastSignalAt: new Date(lastMs).toISOString(),
  };
}

function directionToValue(direction: string): number | null {
  switch (direction) {
    case "positive":
      return 4;
    case "neutral":
      return 3;
    case "negative":
      return 2;
    default:
      return null;
  }
}

function aggregateBehavioralAxis(
  signals: Array<{ signalDirection: string; signalStrength: number }>
): number | null {
  let sumW = 0;
  let sumWV = 0;
  for (const s of signals) {
    const v = directionToValue(s.signalDirection);
    if (v === null) continue;
    const w = Math.max(1, Number.isFinite(s.signalStrength) ? s.signalStrength : 1);
    sumW += w;
    sumWV += w * v;
  }
  if (sumW <= 0) return null;
  const rounded = Math.round(sumWV / sumW);
  return Math.min(5, Math.max(1, rounded));
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: trainingId } = await params;
    if (!trainingId?.trim()) {
      return NextResponse.json({ error: "ID тренировки обязателен" }, { status: 400 });
    }

    const user = await getAuthFromRequest(req);
    if (!user) return unauthorizedResponse();

    const session = await prisma.trainingSession.findUnique({
      where: { id: trainingId },
      include: { team: { select: { schoolId: true } } },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Тренировка не найдена" },
        { status: 404 }
      );
    }

    let filterToPlayerId: string | null = null;

    if (CRM_TRAINING_VIEW_ROLES.has(user.role)) {
      const perms = PERMISSIONS[user.role]?.schedule;
      if (!perms?.view) {
        return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
      }
      if (!canUserAccessSessionTeam(user, session)) {
        return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
      }
    } else if (user.role === "PARENT" && user.parentId) {
      const pid = req.nextUrl.searchParams.get("playerId")?.trim() ?? "";
      if (!pid) {
        return NextResponse.json(
          { error: "Для родителя нужен параметр playerId" },
          { status: 400 }
        );
      }
      const allowed = await canParentAccessPlayer(user.parentId, pid);
      if (!allowed) {
        return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
      }
      const rosterProbe = await getPlayersForTrainingSession({
        teamId: session.teamId,
        groupId: session.groupId,
        startAt: session.startAt,
      });
      if (!rosterProbe.some((p) => p.playerId === pid)) {
        return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
      }
      filterToPlayerId = pid;
    } else {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const liveSession = await prisma.liveTrainingSession.findFirst({
      where: {
        trainingSessionId: trainingId,
        status: "confirmed",
      },
      orderBy: [{ confirmedAt: "desc" }, { updatedAt: "desc" }],
    });

    const emptyPlayers: {
      playerId: string;
      behavioral: { focus?: number; discipline?: number };
    }[] = [];

    if (!liveSession) {
      return NextResponse.json({
        trainingSessionId: trainingId,
        draftSessionId: null,
        players: emptyPlayers,
      });
    }

    const rows = await prisma.liveTrainingPlayerSignal.findMany({
      where: {
        liveTrainingSessionId: liveSession.id,
        metricDomain: BEHAVIOR_DOMAIN,
        metricKey: { in: [KEY_ATTENTION, KEY_DISCIPLINE] },
      },
      select: {
        playerId: true,
        metricKey: true,
        signalDirection: true,
        signalStrength: true,
        createdAt: true,
      },
    });

    const roster = await getPlayersForTrainingSession({
      teamId: session.teamId,
      groupId: session.groupId,
      startAt: session.startAt,
    });
    const rosterIds = new Set(roster.map((p) => p.playerId));

    const byPlayer = new Map<
      string,
      { attention: SignalSlice[]; discipline: SignalSlice[] }
    >();

    for (const r of rows) {
      if (!rosterIds.has(r.playerId)) continue;

      let entry = byPlayer.get(r.playerId);
      if (!entry) {
        entry = { attention: [], discipline: [] };
        byPlayer.set(r.playerId, entry);
      }
      const slice: SignalSlice = {
        playerId: r.playerId,
        metricKey: r.metricKey,
        signalDirection: String(r.signalDirection),
        signalStrength: r.signalStrength,
        createdAt: r.createdAt,
      };
      if (r.metricKey === KEY_ATTENTION) entry.attention.push(slice);
      else entry.discipline.push(slice);
    }

    const players: {
      playerId: string;
      behavioral: { focus?: number; discipline?: number };
      explainability?: {
        focus?: AxisExplainability;
        discipline?: AxisExplainability;
      };
    }[] = [];

    for (const [playerId, { attention, discipline }] of byPlayer) {
      const focus = aggregateBehavioralAxis(attention);
      const disc = aggregateBehavioralAxis(discipline);
      const behavioral: { focus?: number; discipline?: number } = {};
      if (focus !== null) behavioral.focus = focus;
      if (disc !== null) behavioral.discipline = disc;
      if (behavioral.focus !== undefined || behavioral.discipline !== undefined) {
        const explainability: {
          focus?: AxisExplainability;
          discipline?: AxisExplainability;
        } = {};
        const focusEx = explainBehavioralAxis(attention);
        const discEx = explainBehavioralAxis(discipline);
        if (focusEx) explainability.focus = focusEx;
        if (discEx) explainability.discipline = discEx;
        players.push({
          playerId,
          behavioral,
          ...(Object.keys(explainability).length > 0
            ? { explainability }
            : {}),
        });
      }
    }

    const filteredPlayers = filterToPlayerId
      ? players.filter((p) => p.playerId === filterToPlayerId)
      : players;

    return NextResponse.json({
      trainingSessionId: trainingId,
      draftSessionId: null,
      players: filteredPlayers,
    });
  } catch (error) {
    console.error(
      "GET /api/trainings/[id]/behavioral-suggestions failed:",
      error
    );
    return NextResponse.json(
      { error: "Ошибка загрузки подсказок behavioral" },
      { status: 500 }
    );
  }
}
