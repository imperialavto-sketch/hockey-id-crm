/**
 * P0-1: единственная production-реализация Prisma upsert для `TrainingSessionReport`.
 * Вызывается только из `publishLiveTrainingSessionReportDraftForCoach` (live publish path).
 */

import type { Prisma } from "@prisma/client";

export type CanonicalTrainingSessionReportPayload = {
  summary: string | null;
  focusAreas: string | null;
  coachNote: string | null;
  parentMessage: string | null;
};

export async function upsertTrainingSessionReportCanonicalInTransaction(
  tx: Prisma.TransactionClient,
  trainingId: string,
  fields: CanonicalTrainingSessionReportPayload
) {
  return tx.trainingSessionReport.upsert({
    where: { trainingId },
    create: {
      trainingId,
      summary: fields.summary,
      focusAreas: fields.focusAreas,
      coachNote: fields.coachNote,
      parentMessage: fields.parentMessage,
    },
    update: {
      summary: fields.summary,
      focusAreas: fields.focusAreas,
      coachNote: fields.coachNote,
      parentMessage: fields.parentMessage,
    },
  });
}
