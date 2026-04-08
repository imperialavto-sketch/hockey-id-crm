/**
 * POST /api/players/[id]/photo — multipart field `photo` (image/*, max 5MB).
 * Saves under public/uploads/players/ and returns { photoUrl } path for CRM PUT / parent absolutization.
 */

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";

const MAX_BYTES = 5 * 1024 * 1024;
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "players", "edit");
  if (res) return res;

  const { id: playerId } = await params;
  if (!playerId) {
    return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
  }

  const existing = await prisma.player.findUnique({
    where: { id: playerId },
    include: { team: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const accessRes = checkPlayerAccess(user!, {
    ...existing,
    team: existing.team ?? undefined,
  });
  if (accessRes) return accessRes;

  const contentTypeHeader = req.headers.get("content-type") ?? "";
  if (!contentTypeHeader.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Ожидается multipart/form-data" },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Неверное тело запроса" }, { status: 400 });
  }

  const file = formData.get("photo");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "Файл photo обязателен" }, { status: 400 });
  }

  const mime = (file.type || "").split(";")[0].trim().toLowerCase();
  if (!mime.startsWith("image/") || !MIME_EXT[mime]) {
    return NextResponse.json(
      { error: "Допустимы только image/jpeg, png, webp, gif" },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Файл больше 5 МБ" },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  console.log("[api.player.photo] upload", {
    playerId,
    contentType: mime,
    size: buf.length,
  });

  const ext = MIME_EXT[mime];
  const safeName = `${playerId}-${randomBytes(8).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "players");
  await mkdir(dir, { recursive: true });
  const fsPath = path.join(dir, safeName);
  await writeFile(fsPath, buf);

  const photoUrl = `/uploads/players/${safeName}`;
  console.log("[api.player.photo] success", { playerId, photoUrl });

  return NextResponse.json({ ok: true, photoUrl });
}
