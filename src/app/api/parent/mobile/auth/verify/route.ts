/**
 * Parent Mobile Auth — verify code and return user.
 * If pending ParentInvite exists for this phone, links parent to players via ParentPlayer.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  normalizePhone,
  verifyAndConsumeCode,
} from "@/lib/phoneCodeStore";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const VERIFY_LIMIT = 5;
const VERIFY_WINDOW_MS = 10 * 60 * 1000; // 10 минут

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

async function processPendingInvites(phone: string) {
  const invites = await prisma.parentInvite.findMany({
    where: { phone, status: "pending" },
    include: { player: true },
  });
  if (invites.length === 0) return null;

  // Find or create Parent by phone (unique)
  let parent = await prisma.parent.findUnique({
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
      console.warn("[auth][verify] missing phone");
      return NextResponse.json(
        { error: "Введите номер телефона" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }
    if (!codeStr) {
      console.warn("[auth][verify] missing code");
      return NextResponse.json(
        { error: "Введите код подтверждения" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const ip = getClientIp(req);
    const key = `verify:${ip}:${normalized}`;
    const rl = checkRateLimit(key, VERIFY_LIMIT, VERIFY_WINDOW_MS);

    if (!rl.allowed) {
      console.warn("[auth][verify] rate limited", {
        phone: normalized,
        ip,
        retryAfterSec: rl.retryAfterSec,
      });

      return NextResponse.json(
        { error: "Слишком много попыток. Попробуйте позже" },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            "Retry-After": String(rl.retryAfterSec),
          },
        }
      );
    }

    const result = verifyAndConsumeCode(normalized, codeStr);
    if (result === "EXPIRED") {
      console.warn("[auth][verify] code expired", {
        phone: normalized,
        ip,
      });
      return NextResponse.json(
        { error: "Срок действия кода истёк" },
        { status: 410, headers: NO_STORE_HEADERS }
      );
    }
    if (result === "INVALID") {
      console.warn("[auth][verify] invalid code", {
        phone: normalized,
        ip,
      });
      return NextResponse.json(
        { error: "Неверный код" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    let parent = await processPendingInvites(normalized);

    if (!parent) {
      parent = await prisma.parent.upsert({
        where: { phone: normalized },
        create: {
          firstName: "Родитель",
          lastName: normalized.slice(-4),
          phone: normalized,
        },
        update: {},
      });
    }

    const isDev = process.env.NODE_ENV === "development";
    if (isDev && parent) {
      const hasPlayers = await prisma.parentPlayer.count({
        where: { parentId: parent.id },
      });
      const hasLegacy = await prisma.player.count({
        where: { parentId: parent.id },
      });
      if (hasPlayers === 0 && hasLegacy === 0) {
        const firstPlayer = await prisma.player.findFirst({
          where: { lastName: "Голыш" },
        });
        if (firstPlayer) {
          await prisma.parentPlayer.upsert({
            where: {
              parentId_playerId: {
                parentId: parent.id,
                playerId: firstPlayer.id,
              },
            },
            create: {
              parentId: parent.id,
              playerId: firstPlayer.id,
              relation: "parent",
            },
            update: {},
          });
        }
      }
    }

    const user = {
      id: parent.id,
      phone: normalized,
      name: `${parent.firstName} ${parent.lastName}`.trim(),
      role: "PARENT" as const,
      parentId: parent.id,
    };

    console.info("[auth][verify] success", {
      parentId: user.id,
      phone: user.phone,
      ip,
    });

    return NextResponse.json({ user }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[auth][verify] unexpected error", error);
    return NextResponse.json(
      { error: "Не удалось выполнить вход" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
