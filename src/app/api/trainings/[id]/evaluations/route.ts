import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { canUserAccessSessionTeam } from "@/lib/training-session-helpers";
import {
  getPlayersForSessionGroupWeek,
  sessionWeekStartFromSessionStart,
} from "@/lib/training-session-attendance";

const NOTE_MAX = 500;

function evaluationToDto(ev: {
  effort: number | null;
  focus: number | null;
  discipline: number | null;
  note: string | null;
}): {
  effort?: number;
  focus?: number;
  discipline?: number;
  note?: string;
} | null {
  const effort = ev.effort ?? undefined;
  const focus = ev.focus ?? undefined;
  const discipline = ev.discipline ?? undefined;
  const note = ev.note?.trim() ? ev.note.trim() : undefined;
  if (
    effort === undefined &&
    focus === undefined &&
    discipline === undefined &&
    note === undefined
  ) {
    return null;
  }
  const out: {
    effort?: number;
    focus?: number;
    discipline?: number;
    note?: string;
  } = {};
  if (effort !== undefined) out.effort = effort;
  if (focus !== undefined) out.focus = focus;
  if (discipline !== undefined) out.discipline = discipline;
  if (note !== undefined) out.note = note;
  return Object.keys(out).length > 0 ? out : null;
}

function parseScoreField(v: unknown, fieldName: string): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    throw new Error(`${fieldName}: ожидается целое число 1–5 или null`);
  }
  return n;
}

function parseNoteField(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") {
    throw new Error("note: ожидается строка");
  }
  const t = v.trim();
  if (!t) return null;
  return t.length > NOTE_MAX ? t.slice(0, NOTE_MAX) : t;
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
      include: { team: { select: { schoolId: true } } },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Тренировка не найдена" },
        { status: 404 }
      );
    }

    if (!canUserAccessSessionTeam(user!, session)) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const weekStart = sessionWeekStartFromSessionStart(session.startAt);
    const groupPlayers = await getPlayersForSessionGroupWeek(
      session.groupId,
      weekStart
    );

    const evaluations = await prisma.playerSessionEvaluation.findMany({
      where: { trainingId: id },
    });
    const byPlayer = new Map(evaluations.map((e) => [e.playerId, e]));

    const players = groupPlayers.map((p) => {
      const row = byPlayer.get(p.playerId);
      const name = `${p.firstName} ${p.lastName}`.trim() || "Игрок";
      return {
        playerId: p.playerId,
        name,
        evaluation: row ? evaluationToDto(row) : null,
      };
    });

    return NextResponse.json({
      trainingSessionId: id,
      players,
    });
  } catch (error) {
    console.error("GET /api/trainings/[id]/evaluations failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки оценок" },
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

    if (!canUserAccessSessionTeam(user!, session)) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Некорректное тело запроса" },
        { status: 400 }
      );
    }

    const playerIdRaw = body.playerId;
    if (typeof playerIdRaw !== "string" || !playerIdRaw.trim()) {
      return NextResponse.json(
        { error: "Обязательно поле playerId" },
        { status: 400 }
      );
    }
    const playerId = playerIdRaw.trim();

    const weekStart = sessionWeekStartFromSessionStart(session.startAt);
    const groupPlayers = await getPlayersForSessionGroupWeek(
      session.groupId,
      weekStart
    );
    const allowed = groupPlayers.some((p) => p.playerId === playerId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Игрок не в группе на эту неделю для данной тренировки" },
        { status: 403 }
      );
    }

    const prev = await prisma.playerSessionEvaluation.findUnique({
      where: {
        trainingId_playerId: { trainingId, playerId },
      },
    });

    let effort: number | null;
    let focus: number | null;
    let discipline: number | null;
    let note: string | null;

    try {
      effort =
        "effort" in body
          ? parseScoreField(body.effort, "effort")
          : (prev?.effort ?? null);
      focus =
        "focus" in body
          ? parseScoreField(body.focus, "focus")
          : (prev?.focus ?? null);
      discipline =
        "discipline" in body
          ? parseScoreField(body.discipline, "discipline")
          : (prev?.discipline ?? null);
      note =
        "note" in body
          ? parseNoteField(body.note)
          : (prev?.note ?? null);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Неверные данные" },
        { status: 400 }
      );
    }

    const saved = await prisma.playerSessionEvaluation.upsert({
      where: {
        trainingId_playerId: { trainingId, playerId },
      },
      create: {
        trainingId,
        playerId,
        effort,
        focus,
        discipline,
        note,
      },
      update: {
        effort,
        focus,
        discipline,
        note,
      },
    });

    return NextResponse.json({
      trainingSessionId: trainingId,
      playerId: saved.playerId,
      evaluation: evaluationToDto(saved),
    });
  } catch (error) {
    console.error("POST /api/trainings/[id]/evaluations failed:", error);
    return NextResponse.json(
      { error: "Ошибка сохранения оценки" },
      { status: 500 }
    );
  }
}
