import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      title,
      teamId,
      location,
      notes,
      startDate,
      startTime,
      durationMinutes,
      weekdays,
      weeks,
    } = body;

    if (!title || !teamId || !startDate || !startTime) {
      return NextResponse.json(
        { error: "Название, команда, дата и время обязательны" },
        { status: 400 }
      );
    }

    const days = Array.isArray(weekdays)
      ? weekdays.map((d: number | string) => Number(d)).filter((d) => d >= 0 && d <= 6)
      : [1, 3, 5];
    const numWeeks = Math.min(12, Math.max(1, parseInt(String(weeks), 10) || 4));
    const duration = Math.min(180, Math.max(30, parseInt(String(durationMinutes), 10) || 90));

    const [year, month, day] = String(startDate).split("-").map(Number);
    const [hour, minute] = String(startTime).split(":").map(Number);
    const baseDate = new Date(year, (month || 1) - 1, day || 1);

    const created: { id: string; startTime: string }[] = [];

    for (let offset = 0; offset < numWeeks * 7; offset++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + offset);
      const weekday = d.getDay();
      if (!days.includes(weekday)) continue;

      const start = new Date(d);
      start.setHours(hour || 18, minute || 0, 0, 0);
      const end = new Date(start.getTime() + duration * 60 * 1000);

      const training = await prisma.training.create({
        data: {
          title: `${title} (${start.toLocaleDateString("ru-RU")})`,
          startTime: start,
          endTime: end,
          location: location ? String(location).trim() || null : null,
          teamId: String(teamId).trim(),
          notes: notes ? String(notes).trim() || null : null,
        },
      });
      created.push({ id: training.id, startTime: start.toISOString() });
    }

    return NextResponse.json({ ok: true, created: created.length, trainings: created });
  } catch (err) {
    console.error("POST /api/trainings/batch failed:", err);
    return NextResponse.json(
      { error: "Ошибка создания тренировок", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
