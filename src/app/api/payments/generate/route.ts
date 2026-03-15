import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function POST() {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const defaultAmount = 5000;

    const activePlayers = await prisma.player.findMany({
      where: { status: "Активен", teamId: { not: null } },
      include: { parent: true },
    });

    let created = 0;
    for (const player of activePlayers) {
      const exists = await prisma.playerPayment.findFirst({
        where: { playerId: player.id, month, year },
      });
      if (exists) continue;

      await prisma.playerPayment.create({
        data: {
          playerId: player.id,
          month,
          year,
          amount: defaultAmount,
          status: "Не оплачено",
        },
      });
      created++;

      if (player.parentId) {
        await createNotification({
          type: "PAYMENT_DUE",
          title: `Оплата за ${month}/${year}`,
          body: `Начислен платёж ${defaultAmount} ₽ за ${player.firstName} ${player.lastName}`,
          link: `/parent`,
          playerId: player.id,
          parentId: player.parentId,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      month,
      year,
      created,
      total: activePlayers.length,
    });
  } catch (error) {
    console.error("POST /api/payments/generate failed:", error);
    return NextResponse.json(
      { error: "Ошибка генерации платежей" },
      { status: 500 }
    );
  }
}
