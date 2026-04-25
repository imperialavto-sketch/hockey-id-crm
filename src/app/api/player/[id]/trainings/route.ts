import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";
import { sessionWeekStartFromSessionStart } from "@/lib/training-session-attendance";

/**
 * CRM player edit: последние слоты `TrainingSession`, где игрок в составе группы на неделю слота
 * (`PlayerGroupAssignment`), + `TrainingAttendance` по игроку.
 * Legacy `Training` / `Attendance` здесь не возвращаются — канон для отметки: POST /api/trainings/[id]/attendance.
 */
function weekAssignmentKey(groupId: string, weekStart: Date): string {
  return `${groupId}:${sessionWeekStartFromSessionStart(weekStart).getTime()}`;
}

function sessionTitleFromRow(s: {
  type: string;
  subType: string | null;
  notes: string | null;
}): string {
  const note = s.notes?.trim();
  if (note) return note.length > 100 ? `${note.slice(0, 99)}…` : note;
  const parts = [s.type, s.subType].filter(Boolean).join(" · ");
  return parts || "Тренировка";
}

function trainingAttendanceForEditUi(
  row: { id: string; status: string } | undefined
): { id: string; status: string; comment: string | null } | null {
  if (!row) return null;
  const st = String(row.status).toLowerCase().trim();
  const display = st === "present" ? "PRESENT" : st === "absent" ? "ABSENT" : row.status.toUpperCase();
  return { id: row.id, status: display, comment: null };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "players", "view");
  if (res) return res;
  try {
    const { id } = await params;
    const player = await prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (!player) return NextResponse.json([]);
    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;
    if (!player.teamId) return NextResponse.json([]);

    const assignments = await prisma.playerGroupAssignment.findMany({
      where: { playerId: id },
      select: { groupId: true, weekStartDate: true },
    });
    const allowedWeekKeys = new Set(
      assignments.map((a) => weekAssignmentKey(a.groupId, a.weekStartDate))
    );

    const sessions = await prisma.trainingSession.findMany({
      where: {
        teamId: player.teamId,
        groupId: { not: null },
      },
      orderBy: { startAt: "desc" },
      take: 50,
      include: {
        trainingAttendances: {
          where: { playerId: id },
          take: 1,
        },
      },
    });

    const filtered = sessions.filter((s) => {
      if (!s.groupId) return false;
      return allowedWeekKeys.has(weekAssignmentKey(s.groupId, s.startAt));
    });

    const out = filtered.slice(0, 15).map((s) => {
      const attRow = s.trainingAttendances[0];
      return {
        id: s.id,
        title: sessionTitleFromRow(s),
        startTime: s.startAt.toISOString(),
        endTime: s.endAt.toISOString(),
        location: s.locationName ?? s.locationAddress ?? null,
        attendance: trainingAttendanceForEditUi(attRow),
      };
    });

    return NextResponse.json(out);
  } catch (error) {
    console.error("GET /api/player/[id]/trainings failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки тренировок" },
      { status: 500 }
    );
  }
}
