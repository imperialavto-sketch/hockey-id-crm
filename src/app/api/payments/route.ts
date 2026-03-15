import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

export async function GET(req: NextRequest) {
  const { user, res } = await requirePermission(req, "payments", "view");
  if (res) return res;
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    const status = searchParams.get("status");
    const month = searchParams.get("month")
      ? parseInt(searchParams.get("month")!, 10)
      : undefined;
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!, 10)
      : new Date().getFullYear();
    const search = searchParams.get("search")?.trim();

    const playerCond: Record<string, unknown>[] = [];
    if (user!.role === "MAIN_COACH" && user!.teamId) {
      playerCond.push({ teamId: user!.teamId });
    } else if (teamId) {
      playerCond.push({ teamId });
    }
    if (search) {
      playerCond.push({
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
        ],
      });
    }
    const where: Record<string, unknown> = { year };
    if (status) where.status = status;
    if (month) where.month = month;
    if (playerCond.length) where.player = playerCond.length === 1 ? playerCond[0] : { AND: playerCond };

    const payments = await prisma.playerPayment.findMany({
      where,
      include: {
        player: {
          include: { team: true, parent: true },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { player: { lastName: "asc" } }],
    });

    const teams = await prisma.team.findMany({
      select: { id: true, name: true },
    });

    const summary = {
      total: payments.length,
      paid: payments.filter((p) => p.status === "Оплачено").length,
      unpaid: payments.filter((p) => p.status !== "Оплачено").length,
      totalAmount: payments.reduce((s, p) => s + p.amount, 0),
      paidAmount: payments
        .filter((p) => p.status === "Оплачено")
        .reduce((s, p) => s + p.amount, 0),
    };

    return NextResponse.json({
      payments,
      teams,
      summary,
    });
  } catch (error) {
    console.error("GET /api/payments failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки платежей" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { res } = await requirePermission(req, "payments", "create");
  if (res) return res;
  try {
    const body = await req.json().catch(() => ({}));
    const { playerId, month, year, amount, status, paidAt, comment } = body;

    if (!playerId || !month || !year) {
      return NextResponse.json(
        { error: "Игрок, месяц и год обязательны" },
        { status: 400 }
      );
    }

    const m = parseInt(String(month), 10);
    const y = parseInt(String(year), 10);
    if (m < 1 || m > 12 || y < 2020 || y > 2030) {
      return NextResponse.json({ error: "Некорректный месяц или год" }, { status: 400 });
    }

    const payment = await prisma.playerPayment.create({
      data: {
        playerId: String(playerId),
        month: m,
        year: y,
        amount: parseInt(String(amount || 0), 10) || 0,
        status: status ? String(status) : "Не оплачено",
        paidAt: paidAt ? new Date(paidAt) : null,
        comment: comment ? String(comment).trim() || null : null,
      },
      include: { player: { include: { team: true } } },
    });
    return NextResponse.json(payment);
  } catch (err) {
    console.error("POST /api/payments failed:", err);
    return NextResponse.json({ error: "Ошибка создания платежа" }, { status: 500 });
  }
}
