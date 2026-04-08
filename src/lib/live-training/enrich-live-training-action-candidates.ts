/**
 * PHASE 16: пометки материализации для GET action-candidates.
 */

import { prisma } from "@/lib/prisma";
import type { LiveTrainingActionCandidateDto } from "./live-training-action-candidate-types";

export type LiveTrainingActionCandidateWithMaterializationDto = LiveTrainingActionCandidateDto & {
  isMaterialized: boolean;
  materializedItemId: string | null;
};

export async function enrichLiveTrainingActionCandidatesWithMaterialization(
  coachId: string,
  items: LiveTrainingActionCandidateDto[]
): Promise<LiveTrainingActionCandidateWithMaterializationDto[]> {
  if (items.length === 0) return [];
  const ids = items.map((i) => i.id);
  const rows = await prisma.actionItem.findMany({
    where: {
      coachId,
      liveTrainingCandidateId: { in: ids },
    },
    select: { id: true, liveTrainingCandidateId: true },
  });
  const byCand = new Map(
    rows
      .filter((r): r is typeof r & { liveTrainingCandidateId: string } => r.liveTrainingCandidateId != null)
      .map((r) => [r.liveTrainingCandidateId, r.id])
  );
  return items.map((i) => ({
    ...i,
    isMaterialized: byCand.has(i.id),
    materializedItemId: byCand.get(i.id) ?? null,
  }));
}
