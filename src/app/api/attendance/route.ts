import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  const playerId = searchParams.get("playerId");

  const where: Record<string, unknown> = {};
  if (teamId) {
    where.training = { teamId };
  }
  if (playerId) {
    where.playerId = playerId;
  }

  const attendances = await prisma.attendance.findMany({
    where: Object.keys(where).length ? where : undefined,
    include: {
      player: { select: { id: true, firstName: true, lastName: true } },
      training: {
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          location: true,
          team: { select: { name: true } },
        },
      },
    },
    orderBy: { training: { startTime: "desc" } },
    take: 200,
  });

  const summary = {
    present: attendances.filter((a) => a.status === "PRESENT").length,
    absent: attendances.filter((a) => a.status === "ABSENT").length,
    late: attendances.filter((a) => a.status === "LATE").length,
    excused: attendances.filter((a) => a.status === "EXCUSED").length,
    total: attendances.length,
  };

  return NextResponse.json({ attendances, summary });
}
