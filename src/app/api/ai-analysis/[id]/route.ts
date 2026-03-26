/**
 * GET /api/ai-analysis/[id] — alias for parent-app compatibility.
 * Parent-app expects GET /api/ai-analysis/:playerId.
 * Proxies to canonical GET /api/player/[id]/ai-analysis with forwarded auth.
 * Auth and access checks (canParentAccessPlayer for PARENT) are performed by the canonical route.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "ID игрока обязателен" },
      { status: 400 }
    );
  }

  const user = await getAuthFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  const base = req.nextUrl.origin;
  const url = `${base}/api/player/${id}/ai-analysis`;
  const headers: Record<string, string> = {};
  const auth = req.headers.get("authorization");
  if (auth) headers["authorization"] = auth;
  const cookie = req.headers.get("cookie");
  if (cookie) headers["cookie"] = cookie;

  try {
    const res = await fetch(url, { headers });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("GET /api/ai-analysis/[id] proxy failed:", error);
    return NextResponse.json(
      { error: "Ошибка формирования анализа" },
      { status: 500 }
    );
  }
}
