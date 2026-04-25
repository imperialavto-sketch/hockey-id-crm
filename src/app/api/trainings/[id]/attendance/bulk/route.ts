/**
 * POST /api/trainings/[id]/attendance/bulk
 * TrainingSession: body { status: "present" | "absent" } — массовая отметка группы на неделю.
 * Legacy Training: body { status: PRESENT|..., playerIds? } — без изменений.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { canAccessTraining } from "@/lib/data-scope";
import { canUserAccessSessionTeam } from "@/lib/training-session-helpers";
import {
  getPlayersForSessionGroupWeek,
  sessionWeekStartFromSessionStart,
} from "@/lib/training-session-attendance";

const LEGACY_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
const SESSION_BULK = ["present", "absent"] as const;

const CANONICAL_ATTENDANCE_LEGACY_FALLBACK_REASON =
  "training_session_not_found_canonical_attendance_fallback" as const;

/** Telemetry only: canonical attendance bulk POST fell through to legacy `Training` / `Attendance`. No PII. */
function logCanonicalAttendanceLegacyFallback(entry: {
  route: string;
  trainingId: string;
  method: string;
  userId: string | null;
  schoolId: string | null;
  role: string;
  teamId: string | null | undefined;
}) {
  console.warn(
    JSON.stringify({
      route: entry.route,
      trainingId: entry.trainingId,
      method: entry.method,
      userId: entry.userId,
      schoolId: entry.schoolId,
      scope: { role: entry.role, teamId: entry.teamId ?? null },
      reason: CANONICAL_ATTENDANCE_LEGACY_FALLBACK_REASON,
    })
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "trainings", "edit");
  if (res) return res;

  try {
    const { id: trainingId } = await params;
    if (!trainingId) {
      return NextResponse.json({ error: "ID тренировки обязателен" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const session = await prisma.trainingSession.findUnique({
      where: { id: trainingId },
      include: { team: { select: { schoolId: true } } },
    });

    if (session) {
      const statusRaw = body.status;
      if (
        typeof statusRaw !== "string" ||
        !SESSION_BULK.includes(statusRaw as (typeof SESSION_BULK)[number])
      ) {
        return NextResponse.json(
          { error: "status: present или absent" },
          { status: 400 }
        );
      }
      const status = statusRaw as "present" | "absent";

      if (
        !canUserAccessSessionTeam(user!, {
          teamId: session.teamId,
          team: { schoolId: session.team.schoolId },
        })
      ) {
        return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
      }

      const weekStart = sessionWeekStartFromSessionStart(session.startAt);
      const players = await getPlayersForSessionGroupWeek(
        session.groupId,
        weekStart
      );

      if (players.length === 0) {
        return NextResponse.json({ updatedCount: 0, players: [] });
      }

      await prisma.$transaction(
        players.map((p) =>
          prisma.trainingAttendance.upsert({
            where: {
              trainingId_playerId: {
                trainingId: session.id,
                playerId: p.playerId,
              },
            },
            create: {
              trainingId: session.id,
              playerId: p.playerId,
              status,
            },
            update: { status },
          })
        )
      );

      const records = await prisma.trainingAttendance.findMany({
        where: { trainingId: session.id },
      });
      const byPlayer = new Map(records.map((r) => [r.playerId, r.status]));

      const out = players.map((p) => ({
        playerId: p.playerId,
        name: `${p.firstName} ${p.lastName}`.trim(),
        status: (byPlayer.get(p.playerId) as "present" | "absent") ?? status,
      }));

      return NextResponse.json({
        updatedCount: players.length,
        players: out,
      });
    }

    logCanonicalAttendanceLegacyFallback({
      route: "POST /api/trainings/[id]/attendance/bulk",
      trainingId,
      method: "POST",
      userId: user?.id ?? null,
      schoolId: user?.schoolId ?? null,
      role: user?.role ?? "unknown",
      teamId: user?.teamId,
    });

    /* Legacy Training */
    const { status, playerIds } = body;
    if (
      typeof status !== "string" ||
      !LEGACY_STATUSES.includes(status as (typeof LEGACY_STATUSES)[number])
    ) {
      return NextResponse.json(
        { error: "Недопустимый статус посещаемости" },
        { status: 400 }
      );
    }

    const training = await prisma.training.findUnique({
      where: { id: trainingId },
      include: { team: true },
    });
    if (!training) {
      return NextResponse.json({ error: "Тренировка не найдена" }, { status: 404 });
    }
    if (!canAccessTraining(user!, { ...training, team: training.team ?? undefined })) {
      return NextResponse.json({ error: "Нет доступа к тренировке" }, { status: 403 });
    }

    const ids: string[] = Array.isArray(playerIds)
      ? playerIds.filter((x: unknown): x is string => typeof x === "string")
      : [];
    if (ids.length === 0) {
      const teamPlayers = await prisma.player.findMany({
        where: { teamId: training.teamId },
        select: { id: true },
      });
      ids.push(...teamPlayers.map((p) => p.id));
    }

    const statusVal = status as (typeof LEGACY_STATUSES)[number];
    const results = await Promise.all(
      ids.map(async (playerId: string) => {
        const player = await prisma.player.findUnique({ where: { id: playerId } });
        if (!player || player.teamId !== training.teamId) return null;
        return prisma.attendance.upsert({
          where: {
            trainingId_playerId: { trainingId, playerId },
          },
          create: {
            trainingId,
            playerId,
            status: statusVal,
          },
          update: { status: statusVal },
        });
      })
    );

    return NextResponse.json({ updated: results.filter(Boolean).length });
  } catch (error) {
    console.error("POST /api/trainings/[id]/attendance/bulk failed:", error);
    return NextResponse.json(
      { error: "Ошибка массовой отметки посещаемости" },
      { status: 500 }
    );
  }
}
