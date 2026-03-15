import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ActivityType =
  | "create_player"
  | "create_training"
  | "payment_updated"
  | "rating_added"
  | "recommendation_added"
  | "create_team"
  | "create_coach";

export async function logActivity(
  type: ActivityType,
  message: string,
  options?: { entityType?: string; entityId?: string; metadata?: Record<string, unknown> }
) {
  try {
    await prisma.activityLog.create({
      data: {
        type,
        entityType: options?.entityType ?? null,
        entityId: options?.entityId ?? null,
        message,
        metadata: (options?.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    console.error("logActivity failed:", e);
  }
}
