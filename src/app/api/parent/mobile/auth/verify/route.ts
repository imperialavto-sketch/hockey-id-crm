/**
 * Parent Mobile Auth — verify code and return user.
 * If pending ParentInvite exists for this phone, links parent to players via ParentPlayer.
 * TODO: Connect to real verification store / DB.
 * For now: code 1234 accepted in development.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEV_CODE = "1234";

function normalizePhone(phone: string): string {
  return String(phone ?? "").replace(/\D/g, "").trim();
}

async function processPendingInvites(phone: string) {
  const invites = await prisma.parentInvite.findMany({
    where: { phone, status: "pending" },
    include: { player: true },
  });
  if (invites.length === 0) return null;

  // Create or find Parent by phone
  let parent = await prisma.parent.findFirst({
    where: { phone },
  });

  if (!parent) {
    const firstName = "Родитель";
    const lastName = invites[0]?.player
      ? `${invites[0].player.lastName}`
      : phone.slice(-4);
    parent = await prisma.parent.create({
      data: {
        firstName,
        lastName,
        phone,
      },
    });
  }

  const now = new Date();
  for (const inv of invites) {
    await prisma.parentPlayer.upsert({
      where: {
        parentId_playerId: { parentId: parent.id, playerId: inv.playerId },
      },
      create: {
        parentId: parent.id,
        playerId: inv.playerId,
        relation: "parent",
      },
      update: {},
    });
    await prisma.parentInvite.update({
      where: { id: inv.id },
      data: { status: "accepted", acceptedAt: now },
    });
  }

  return parent;
}

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json().catch(() => ({}));
    const normalized = normalizePhone(phone);
    const codeStr = String(code ?? "").trim();

    if (!normalized) {
      return NextResponse.json(
        { error: "Введите номер телефона" },
        { status: 400 }
      );
    }
    if (!codeStr) {
      return NextResponse.json(
        { error: "Введите код подтверждения" },
        { status: 400 }
      );
    }

    const isDev = process.env.NODE_ENV === "development";
    const codeValid = isDev && codeStr === DEV_CODE;
    // TODO: real verification: codeValid = await verifyStoredCode(normalized, codeStr);

    if (!codeValid) {
      return NextResponse.json({ error: "Неверный код" }, { status: 401 });
    }

    // Process pending invites — link parent to players
    let parent = await processPendingInvites(normalized);

    // No invites: find or create parent by phone
    if (!parent) {
      parent = await prisma.parent.findFirst({
        where: { phone: normalized },
      });
    }

    if (!parent) {
      // Create minimal parent (invited parents get linked above; this handles first-time login)
      parent = await prisma.parent.create({
        data: {
          firstName: "Родитель",
          lastName: normalized.slice(-4),
          phone: normalized,
        },
      });
    }

    // Dev fallback: link to Голыш Марк for testing if no players linked
    if (isDev && parent) {
      const hasPlayers = await prisma.parentPlayer.count({
        where: { parentId: parent!.id },
      });
      const hasLegacy = await prisma.player.count({
        where: { parentId: parent!.id },
      });
      if (hasPlayers === 0 && hasLegacy === 0) {
        const firstPlayer = await prisma.player.findFirst({
          where: { lastName: "Голыш" },
        });
        if (firstPlayer) {
          await prisma.parentPlayer.upsert({
            where: {
              parentId_playerId: {
                parentId: parent!.id,
                playerId: firstPlayer.id,
              },
            },
            create: {
              parentId: parent!.id,
              playerId: firstPlayer.id,
              relation: "parent",
            },
            update: {},
          });
        }
      }
    }

    const user = {
      id: parent!.id,
      phone: normalized,
      name: `${parent!.firstName} ${parent!.lastName}`.trim(),
      role: "PARENT" as const,
      parentId: parent!.id,
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error("POST /api/parent/mobile/auth/verify failed:", error);
    return NextResponse.json(
      { error: "Не удалось выполнить вход" },
      { status: 500 }
    );
  }
}
