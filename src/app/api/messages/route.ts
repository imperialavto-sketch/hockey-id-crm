import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requirePermission } from "@/lib/api-rbac";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { res } = await requirePermission(req, "messages", "view");
  if (res) return res;
  const messages = await prisma.message.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      parent: { select: { firstName: true, lastName: true } },
      player: { select: { firstName: true, lastName: true } },
    },
  });
  return NextResponse.json(messages);
}
