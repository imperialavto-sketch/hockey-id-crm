/**
 * GET/POST /api/trainings/[id]/attendance
 * TrainingSession: посещаемость по игрокам группы на неделю (PlayerGroupAssignment).
 * Legacy Training: POST → модель Attendance (без GET).
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

const SESSION_STATUSES = ["present", "absent"] as const;

const LEGACY_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;

const CANONICAL_ATTENDANCE_LEGACY_FALLBACK_REASON =
  "training_session_not_found_canonical_attendance_fallback" as const;

/** Telemetry only: canonical attendance POST fell through to legacy `Training` / `Attendance`. No PII. */
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "trainings", "view");
  if (res) return res;

  try {
    const { id } = await params;

    const session = await prisma.trainingSession.findUnique({
      where: { id },
      include: {
        team: { select: { schoolId: true } },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Тренировка-сессия не найдена" },
        { status: 404 }
      );
    }

    if (
      !canUserAccessSessionTeam(user!, {
        teamId: session.teamId,
        team: { schoolId: session.team.schoolId },
      })
    ) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const weekStart = sessionWeekStartFromSessionStart(session.startAt);

    const groupPlayers = await getPlayersForSessionGroupWeek(
      session.groupId,
      weekStart
    );

    const records = await prisma.trainingAttendance.findMany({
      where: { trainingId: session.id },
    });
    const statusByPlayer = new Map(records.map((r) => [r.playerId, r.status]));

    const players = groupPlayers.map((p) => ({
      playerId: p.playerId,
      name: `${p.firstName} ${p.lastName}`.trim(),
      status: (statusByPlayer.get(p.playerId) as "present" | "absent" | undefined) ?? null,
    }));

    return NextResponse.json({ players });
  } catch (error) {
    console.error("GET /api/trainings/[id]/attendance failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки посещаемости" },
      { status: 500 }
    );
  }
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
      return NextResponse.json(
        { error: "ID тренировки обязателен" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { playerId, status, comment } = body;

    const session = await prisma.trainingSession.findUnique({
      where: { id: trainingId },
      include: { team: { select: { schoolId: true } } },
    });

    if (session) {
      if (
        !canUserAccessSessionTeam(user!, {
          teamId: session.teamId,
          team: { schoolId: session.team.schoolId },
        })
      ) {
        return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
      }

      if (!playerId || !status) {
        return NextResponse.json(
          { error: "Игрок и статус обязательны" },
          { status: 400 }
        );
      }

      const st = String(status).toLowerCase().trim();
      if (!SESSION_STATUSES.includes(st as (typeof SESSION_STATUSES)[number])) {
        return NextResponse.json(
          { error: "Статус: present или absent" },
          { status: 400 }
        );
      }

      const weekStart = sessionWeekStartFromSessionStart(session.startAt);
      const inGroup =
        session.groupId != null
          ? await prisma.playerGroupAssignment.findFirst({
              where: {
                playerId: String(playerId),
                groupId: session.groupId,
                weekStartDate: weekStart,
              },
            })
          : null;

      if (!inGroup) {
        return NextResponse.json(
          { error: "Игрок не в группе на эту неделю" },
          { status: 400 }
        );
      }

      const row = await prisma.trainingAttendance.upsert({
        where: {
          trainingId_playerId: {
            trainingId: session.id,
            playerId: String(playerId),
          },
        },
        create: {
          trainingId: session.id,
          playerId: String(playerId),
          status: st,
        },
        update: { status: st },
      });

      return NextResponse.json(row);
    }

    logCanonicalAttendanceLegacyFallback({
      route: "POST /api/trainings/[id]/attendance",
      trainingId,
      method: "POST",
      userId: user?.id ?? null,
      schoolId: user?.schoolId ?? null,
      role: user?.role ?? "unknown",
      teamId: user?.teamId,
    });

    /* Legacy Training + Attendance */
    if (!playerId || !status) {
      return NextResponse.json(
        { error: "Игрок и статус обязательны" },
        { status: 400 }
      );
    }

    if (!LEGACY_STATUSES.includes(status)) {
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

    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });
    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    if (player.teamId !== training.teamId) {
      return NextResponse.json(
        { error: "Игрок не входит в состав команды этой тренировки" },
        { status: 400 }
      );
    }

    const updateData: {
      status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
      comment?: string | null;
    } = {
      status: status as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
    };
    if (comment !== undefined) updateData.comment = comment || null;

    const attendance = await prisma.attendance.upsert({
      where: {
        trainingId_playerId: { trainingId, playerId: String(playerId) },
      },
      create: {
        trainingId,
        playerId: String(playerId),
        status: status as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
        comment: comment || null,
      },
      update: updateData,
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("POST /api/trainings/[id]/attendance failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка сохранения посещаемости",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
