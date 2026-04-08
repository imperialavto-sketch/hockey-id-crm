import { Prisma, type StatsSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { COACH_SESSION_METRICS_SCHEMA_VERSION } from "./types";
import type { ParsedPlayerSessionStructuredMetricsMerge } from "./validate";

function pickSchemaVersion(
  patch: ParsedPlayerSessionStructuredMetricsMerge,
  previous: number | null | undefined
): number {
  if (patch.schemaVersion !== undefined) return patch.schemaVersion;
  return previous ?? COACH_SESSION_METRICS_SCHEMA_VERSION;
}

/** Prisma nullable Json: use `DbNull` to clear a bucket in the database. */
function jsonBucket(
  v: unknown
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (v === undefined) return undefined;
  if (v === null) return Prisma.DbNull;
  return v as Prisma.InputJsonValue;
}

/**
 * Upsert structured metrics for one player on a training session.
 * Only fields present in `patch` are written; omitted JSON buckets stay unchanged on update.
 * On first create, omitted buckets are stored as null.
 */
export async function upsertPlayerSessionStructuredMetrics(
  trainingSessionId: string,
  playerId: string,
  source: StatsSource,
  patch: ParsedPlayerSessionStructuredMetricsMerge
): Promise<void> {
  const existing = await prisma.playerSessionStructuredMetrics.findUnique({
    where: {
      trainingSessionId_playerId: { trainingSessionId, playerId },
    },
  });

  const schemaVersion = pickSchemaVersion(patch, existing?.schemaVersion);

  const updatePayload = {
    schemaVersion,
    source,
    ...(patch.iceTechnical !== undefined
      ? { iceTechnical: jsonBucket(patch.iceTechnical) }
      : {}),
    ...(patch.tactical !== undefined
      ? { tactical: jsonBucket(patch.tactical) }
      : {}),
    ...(patch.ofpQualitative !== undefined
      ? { ofpQualitative: jsonBucket(patch.ofpQualitative) }
      : {}),
    ...(patch.physical !== undefined
      ? { physical: jsonBucket(patch.physical) }
      : {}),
    ...(patch.behavioral !== undefined
      ? { behavioral: jsonBucket(patch.behavioral) }
      : {}),
    ...(patch.observation !== undefined
      ? { observation: jsonBucket(patch.observation ?? null) }
      : {}),
    ...(patch.voiceMeta !== undefined
      ? { voiceMeta: jsonBucket(patch.voiceMeta ?? null) }
      : {}),
  };

  await prisma.playerSessionStructuredMetrics.upsert({
    where: {
      trainingSessionId_playerId: { trainingSessionId, playerId },
    },
    create: {
      trainingSessionId,
      playerId,
      schemaVersion,
      source,
      iceTechnical: jsonBucket(
        patch.iceTechnical !== undefined ? patch.iceTechnical : null
      ),
      tactical: jsonBucket(
        patch.tactical !== undefined ? patch.tactical : null
      ),
      ofpQualitative: jsonBucket(
        patch.ofpQualitative !== undefined ? patch.ofpQualitative : null
      ),
      physical: jsonBucket(
        patch.physical !== undefined ? patch.physical : null
      ),
      behavioral: jsonBucket(
        patch.behavioral !== undefined ? patch.behavioral : null
      ),
      observation: jsonBucket(
        patch.observation !== undefined ? patch.observation ?? null : null
      ),
      voiceMeta: jsonBucket(
        patch.voiceMeta !== undefined ? patch.voiceMeta ?? null : null
      ),
    },
    update: updatePayload,
  });
}

export async function listPlayerSessionStructuredMetricsForTraining(
  trainingSessionId: string
) {
  return prisma.playerSessionStructuredMetrics.findMany({
    where: { trainingSessionId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getPlayerSessionStructuredMetrics(
  trainingSessionId: string,
  playerId: string
) {
  return prisma.playerSessionStructuredMetrics.findUnique({
    where: {
      trainingSessionId_playerId: { trainingSessionId, playerId },
    },
  });
}
