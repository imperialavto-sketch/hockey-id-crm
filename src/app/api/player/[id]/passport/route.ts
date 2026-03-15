import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "players", "edit");
  if (res) return res;
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
    }

    const player = await prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }
    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;

    const body = await req.json().catch(() => ({}));
    const {
      passportNumber,
      issueDate,
      expiryDate,
      issuedBy,
      internationalID,
    } = body;

    if (!passportNumber || !issueDate || !expiryDate || !issuedBy) {
      return NextResponse.json(
        { error: "Номер, даты выдачи/срока и кем выдан обязательны" },
        { status: 400 }
      );
    }

    const issue = new Date(issueDate);
    const expiry = new Date(expiryDate);
    if (isNaN(issue.getTime()) || isNaN(expiry.getTime())) {
      return NextResponse.json(
        { error: "Некорректный формат дат" },
        { status: 400 }
      );
    }

    const passport = await prisma.passport.upsert({
      where: { playerId: id },
      create: {
        playerId: id,
        passportNumber: String(passportNumber).trim(),
        issueDate: issue,
        expiryDate: expiry,
        issuedBy: String(issuedBy).trim(),
        internationalID: internationalID ? String(internationalID).trim() : null,
      },
      update: {
        passportNumber: String(passportNumber).trim(),
        issueDate: issue,
        expiryDate: expiry,
        issuedBy: String(issuedBy).trim(),
        internationalID: internationalID ? String(internationalID).trim() : null,
      },
    });

    return NextResponse.json(passport);
  } catch (error) {
    console.error("POST /api/player/[id]/passport failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка сохранения паспорта",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
