/**
 * Re-engagement: спокойное in-app + push при публикации TrainingSessionReport (live-training publish).
 * Без срочности; дедуп по parentId + playerId + trainingId.
 */

import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPushToParent } from "@/lib/notifications/sendPush";

/** Контракт для копирайта пуша / списка (без утечки внутренних полей в API ответа). */
export type ParentReengagementNotificationDto = {
  type: "new_report" | "progress_update";
  title: string;
  body: string;
  playerId: string;
};

function calmPreviewBody(preview: string, firstName: string): string {
  const hint = preview.trim().replace(/\s+/gu, " ").slice(0, 100);
  if (hint.length > 0) {
    return `${firstName}: ${hint}${preview.trim().length > 100 ? "…" : ""} — загляните в карточку, когда будет удобно.`;
  }
  return `Для ${firstName} в приложении появился спокойный итог тренировки — без спешки и без оценочных баллов.`;
}

/**
 * Уведомить родителей детей с явкой present на этой тренировке.
 */
export async function notifyParentsOfPublishedTrainingReport(opts: {
  trainingId: string;
  teamName: string | null;
  previewLine: string;
}): Promise<void> {
  const attendances = await prisma.trainingAttendance.findMany({
    where: { trainingId: opts.trainingId, status: "present" },
    select: {
      playerId: true,
      player: {
        select: {
          firstName: true,
          parentPlayers: { select: { parentId: true } },
        },
      },
    },
  });

  const teamSuffix = opts.teamName?.trim() ? ` · ${opts.teamName.trim()}` : "";

  for (const row of attendances) {
    const pl = row.player;
    const firstName = pl.firstName?.trim() || "Игрок";
    const parentIds = new Set<string>();
    for (const pp of pl.parentPlayers) parentIds.add(pp.parentId);

    for (const parentId of parentIds) {
      const dup = await prisma.notification.findFirst({
        where: {
          parentId,
          type: NotificationType.TRAINING_REPORT_PUBLISHED,
          AND: [
            { data: { path: ["trainingId"], equals: opts.trainingId } },
            { data: { path: ["playerId"], equals: row.playerId } },
          ],
        },
        select: { id: true },
      });
      if (dup) continue;

      const dto: ParentReengagementNotificationDto = {
        type: "new_report",
        title: `Итог тренировки${teamSuffix}`,
        body: calmPreviewBody(opts.previewLine, firstName),
        playerId: row.playerId,
      };

      const data = {
        kind: "training_report",
        reengagementType: dto.type,
        trainingId: opts.trainingId,
        playerId: row.playerId,
        notifySection: "report",
      };

      const created = await prisma.notification.create({
        data: {
          type: NotificationType.TRAINING_REPORT_PUBLISHED,
          title: dto.title,
          body: dto.body,
          parentId,
          playerId: row.playerId,
          data: data as unknown as Prisma.InputJsonValue,
          link: `/player/${row.playerId}?notifySection=report`,
          pushSent: false,
        },
      });

      try {
        const pushResult = await sendPushToParent(parentId, {
          type: "training_report_published",
          title: dto.title,
          body: dto.body.slice(0, 140),
          playerId: row.playerId,
          notifySection: "report",
          trainingId: opts.trainingId,
        });
        if (pushResult.sent > 0) {
          await prisma.notification.update({
            where: { id: created.id },
            data: { pushSent: true },
          });
        }
      } catch (e) {
        console.warn("[notifyParentsOfPublishedTrainingReport] push failed:", e);
      }
    }
  }
}
