/**
 * Internal read-only: evidence manifest for **materialized** `LiveTrainingPlayerSignal` rows in one session.
 *
 * - Primary row: signal; linked `LiveTrainingObservationDraft` for `sourceText` + `ingestProvenanceJson`.
 * - Intended for **confirmed** sessions (signals exist after confirm); returns `null` if session missing or not confirmed.
 *
 * **Not** a proof bundle for Arena session meaning, planned-vs-observed facts, CRM summaries, or parent copy.
 * **Not** an aggregate claim that independent `evidenceText` and `sourceText` are separate truths — on materialize,
 * `evidenceText` is derived from draft `sourceText` (duplicate by design).
 *
 * @see `createLiveTrainingPlayerSignalsInTransaction` — write path unchanged here.
 */

import { LiveTrainingSessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseIngestProvenanceFromDb } from "@/lib/live-training/live-training-ingest-provenance";

/** Deterministic subset of ingest provenance for internal scans (no LLM, no narrative). */
export type LiveTrainingSessionEvidenceManifestItemProvenanceSummary = {
  contextUsed: boolean;
  contextAdjustedPlayerMatch: boolean;
  contextAdjustedCategory: boolean;
  contextAdjustedSentiment: boolean;
  parserConfidenceBeforeContext: number | null;
  parserConfidenceAfterContext: number | null;
};

export type LiveTrainingSessionEvidenceManifestItemDto = {
  liveTrainingPlayerSignalId: string;
  liveTrainingObservationDraftId: string;
  playerId: string;
  metricDomain: string;
  metricKey: string;
  signalDirection: string;
  signalStrength: number;
  /** Snapshot on signal row (same lineage as `sourceText` at materialize time). */
  evidenceText: string;
  /** Canonical observation text on the linked draft. */
  sourceText: string;
  hasIngestProvenance: boolean;
  /** Present only when `ingestProvenanceJson` parses; describes ingest-time context, not Arena aggregates. */
  optionalProvenanceSummary?: LiveTrainingSessionEvidenceManifestItemProvenanceSummary;
};

export type LiveTrainingSessionEvidenceManifestDto = {
  liveTrainingSessionId: string;
  teamId: string;
  signalCount: number;
  items: LiveTrainingSessionEvidenceManifestItemDto[];
};

function buildOptionalProvenanceSummary(
  raw: unknown
): { hasIngestProvenance: boolean; optionalProvenanceSummary?: LiveTrainingSessionEvidenceManifestItemProvenanceSummary } {
  if (raw == null) {
    return { hasIngestProvenance: false };
  }
  const parsed = parseIngestProvenanceFromDb(raw);
  /** Non-object JSON (e.g. array) → no structured ingest layer to report. */
  if (parsed == null) {
    return { hasIngestProvenance: false };
  }
  return {
    hasIngestProvenance: true,
    optionalProvenanceSummary: {
      contextUsed: parsed.contextUsed,
      contextAdjustedPlayerMatch: parsed.contextAdjustedPlayerMatch,
      contextAdjustedCategory: parsed.contextAdjustedCategory,
      contextAdjustedSentiment: parsed.contextAdjustedSentiment,
      parserConfidenceBeforeContext: parsed.parserConfidenceBeforeContext,
      parserConfidenceAfterContext: parsed.parserConfidenceAfterContext,
    },
  };
}

/**
 * Read-only manifest for one live session. Returns `null` if session not found or status is not `confirmed`.
 * Does not load `LiveTrainingEvent` — chain is signal → draft → optional event via draft FK if needed later.
 */
export async function getLiveTrainingSessionEvidenceManifest(
  liveTrainingSessionId: string
): Promise<LiveTrainingSessionEvidenceManifestDto | null> {
  const sessionId = liveTrainingSessionId.trim();
  if (!sessionId) return null;

  const session = await prisma.liveTrainingSession.findFirst({
    where: { id: sessionId },
    select: { id: true, teamId: true, status: true },
  });
  if (!session || session.status !== LiveTrainingSessionStatus.confirmed) {
    return null;
  }

  const rows = await prisma.liveTrainingPlayerSignal.findMany({
    where: { liveTrainingSessionId: sessionId },
    select: {
      id: true,
      playerId: true,
      metricDomain: true,
      metricKey: true,
      signalDirection: true,
      signalStrength: true,
      evidenceText: true,
      liveTrainingObservationDraftId: true,
      LiveTrainingObservationDraft: {
        select: {
          id: true,
          sourceText: true,
          ingestProvenanceJson: true,
        },
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const items: LiveTrainingSessionEvidenceManifestItemDto[] = [];
  for (const r of rows) {
    const d = r.LiveTrainingObservationDraft;
    if (!d) continue;

    const prov = buildOptionalProvenanceSummary(d.ingestProvenanceJson);

    items.push({
      liveTrainingPlayerSignalId: r.id,
      liveTrainingObservationDraftId: d.id,
      playerId: r.playerId,
      metricDomain: r.metricDomain,
      metricKey: r.metricKey,
      signalDirection: r.signalDirection,
      signalStrength: r.signalStrength,
      evidenceText: r.evidenceText,
      sourceText: d.sourceText,
      hasIngestProvenance: prov.hasIngestProvenance,
      ...(prov.optionalProvenanceSummary
        ? { optionalProvenanceSummary: prov.optionalProvenanceSummary }
        : {}),
    });
  }

  return {
    liveTrainingSessionId: sessionId,
    teamId: session.teamId,
    signalCount: items.length,
    items,
  };
}
