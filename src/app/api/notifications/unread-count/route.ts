/**
 * GET /api/notifications/unread-count — число непрочитанных in-app уведомлений родителя.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const t0 = Date.now();
  const log = (phase: string, extra?: Record<string, unknown>) =>
    console.log("[api.timing] GET /api/notifications/unread-count", phase, {
      ms: Date.now() - t0,
      ...extra,
    });

  log("route_enter");
  const user = await getAuthFromRequest(req);
  log("auth_done");

  if (!user || user.role !== "PARENT" || !user.parentId) {
    log("response_send", { status: 401 });
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  try {
    log("db_count_enter");
    const count = await prisma.notification.count({
      where: { parentId: user.parentId, read: false },
    });
    log("db_count_exit");
    log("response_send", { status: 200 });
    return NextResponse.json({ count });
  } catch (error) {
    console.error("GET /api/notifications/unread-count failed:", error);
    log("catch");
    log("response_send", { status: 500, error: true });
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
