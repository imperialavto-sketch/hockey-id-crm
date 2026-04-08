import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, forbiddenResponse, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export type ExternalCoachAuthOk = {
  userId: string;
  arenaCoachKey: string;
};

/**
 * Только User с ролью EXTERNAL_COACH и заполненным arenaExternalCoachKey (совпадает с coachId в Arena request).
 */
export async function requireExternalCoach(
  req: NextRequest
): Promise<
  | { ok: true; auth: ExternalCoachAuthOk }
  | { ok: false; res: NextResponse }
> {
  const user = await getAuthFromRequest(req);
  if (!user) {
    return { ok: false, res: unauthorizedResponse() };
  }
  if (user.role !== "EXTERNAL_COACH") {
    return { ok: false, res: forbiddenResponse("Доступ только для внешнего тренера Arena") };
  }

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { arenaExternalCoachKey: true },
  });
  const key = row?.arenaExternalCoachKey?.trim();
  if (!key) {
    return {
      ok: false,
      res: NextResponse.json(
        {
          error:
            "Профиль внешнего тренера не настроен: укажите arenaExternalCoachKey у пользователя в БД",
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, auth: { userId: user.id, arenaCoachKey: key } };
}
