/**
 * Internal read helper: rollup of `LiveTrainingPlayerSignal` rows for one live session **only** within
 * `arenaGroupAttributionVersion === "session_canonical_v1"` (session-context stamp on confirm).
 *
 * **Not** strict group observed truth: signals are not proven to be «about» subgroup G; mixed rosters and
 * session-only observation drafts (no materialized signal) stay outside this rollup.
 *
 * **Not** team planned-vs-observed fact: do not conflate with `ArenaPlannedVsObservedLiveFact` or reuse
 * that write/read path for semantics.
 *
 * Diagnostic / internal-read oriented — safe to call from jobs or future API layers; no side effects.
 */

import { prisma } from "@/lib/prisma";
import { canonicalGroupIdForLiveSession } from "@/lib/live-training/canonical-group-of-live-session";
import { getCanonicalTrainingSessionIdFromLiveRow } from "@/lib/live-training/resolve-live-training-to-training-session";

/** Must match the version written in `createLiveTrainingPlayerSignalsInTransaction`. */
export const LIVE_TRAINING_SESSION_GROUP_CONTEXT_ATTRIBUTION_VERSION = "session_canonical_v1" as const;

export type LiveTrainingSessionGroupContextCoverageKind =
  | "no_signals"
  | "all_legacy"
  | "mixed"
  | "fully_attributed";

export type LiveTrainingSessionGroupContextSignalRollupDto = {
  liveTrainingSessionId: string;
  teamId: string;
  /** Same rule as signal materialize: `canonicalGroupIdForLiveSession` + linked slot `groupId` when resolvable. */
  canonicalGroupId: string | null;
  attributionVersionUsed: typeof LIVE_TRAINING_SESSION_GROUP_CONTEXT_ATTRIBUTION_VERSION;
  /** Signals with `metadataJson.arenaGroupAttributionVersion === session_canonical_v1`. */
  attributedSignalCount: number;
  /** Signals without that version (includes pre-stamp rows and any other shape). */
  legacySignalCount: number;
  attributedPositiveSignalCount: number;
  attributedNegativeSignalCount: number;
  /** Domain counts **only** for the attributed cohort (`metricDomain` trimmed). */
  attributedDomainsJson: Record<string, number>;
  coverageKind: LiveTrainingSessionGroupContextCoverageKind;
};

export function isSessionCanonicalV1Attributed(metadataJson: unknown): boolean {
  if (metadataJson == null || typeof metadataJson !== "object" || Array.isArray(metadataJson)) {
    return false;
  }
  const o = metadataJson as Record<string, unknown>;
  return o.arenaGroupAttributionVersion === LIVE_TRAINING_SESSION_GROUP_CONTEXT_ATTRIBUTION_VERSION;
}

type LiveRowForGroupContextSelect = {
  id: string;
  teamId: string;
  planningSnapshotJson: unknown;
  trainingSessionId: string | null;
};

async function loadLiveRowWithCanonicalGroupId(
  sessionId: string
): Promise<{ liveRow: LiveRowForGroupContextSelect; canonicalGroupId: string | null } | null> {
  const liveRow = await prisma.liveTrainingSession.findFirst({
    where: { id: sessionId },
    select: { id: true, teamId: true, planningSnapshotJson: true, trainingSessionId: true },
  });
  if (!liveRow) return null;

  let linkedTrainingSessionGroupId: string | null | undefined;
  const slotId = getCanonicalTrainingSessionIdFromLiveRow({
    trainingSessionId: liveRow.trainingSessionId,
    planningSnapshotJson: liveRow.planningSnapshotJson,
  });
  if (slotId) {
    const slot = await prisma.trainingSession.findFirst({
      where: { id: slotId, teamId: liveRow.teamId },
      select: { groupId: true },
    });
    linkedTrainingSessionGroupId = slot?.groupId?.trim() || null;
  }

  const canonicalGroupId = canonicalGroupIdForLiveSession({
    planningSnapshotJson: liveRow.planningSnapshotJson,
    linkedTrainingSessionGroupId,
  });

  return { liveRow, canonicalGroupId };
}

/** `arenaSessionGroupId` on stamped cohort only; missing / null / empty → `null`. */
export function stampedArenaSessionGroupIdFromMetadata(metadataJson: unknown): string | null {
  if (!isSessionCanonicalV1Attributed(metadataJson)) return null;
  const o = metadataJson as Record<string, unknown>;
  const v = o.arenaSessionGroupId;
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t.slice(0, 64) : null;
}

/** Pure: `coverageKind` from per-session signal cohort counts (rollup semantics). */
export function computeGroupContextCoverageKind(input: {
  totalSignalCount: number;
  attributedSignalCount: number;
  legacySignalCount: number;
}): LiveTrainingSessionGroupContextCoverageKind {
  const { totalSignalCount, attributedSignalCount, legacySignalCount } = input;
  if (totalSignalCount === 0) return "no_signals";
  if (attributedSignalCount === 0) return "all_legacy";
  if (legacySignalCount === 0) return "fully_attributed";
  return "mixed";
}

/**
 * Read-only rollup for one `LiveTrainingSession.id`. Returns `null` if the session row does not exist.
 */
export async function getLiveTrainingSessionGroupContextSignalRollup(
  liveTrainingSessionId: string
): Promise<LiveTrainingSessionGroupContextSignalRollupDto | null> {
  const sessionId = liveTrainingSessionId.trim();
  if (!sessionId) return null;

  const basis = await loadLiveRowWithCanonicalGroupId(sessionId);
  if (!basis) return null;
  const { liveRow, canonicalGroupId } = basis;

  const signals = await prisma.liveTrainingPlayerSignal.findMany({
    where: { liveTrainingSessionId: sessionId },
    select: { metadataJson: true, signalDirection: true, metricDomain: true },
  });

  let attributedSignalCount = 0;
  let legacySignalCount = 0;
  let attributedPositiveSignalCount = 0;
  let attributedNegativeSignalCount = 0;
  const attributedDomainsJson: Record<string, number> = {};

  for (const s of signals) {
    if (isSessionCanonicalV1Attributed(s.metadataJson)) {
      attributedSignalCount += 1;
      if (s.signalDirection === "positive") {
        attributedPositiveSignalCount += 1;
      } else if (s.signalDirection === "negative") {
        attributedNegativeSignalCount += 1;
      }
      const domain = s.metricDomain?.trim();
      if (domain) {
        attributedDomainsJson[domain] = (attributedDomainsJson[domain] ?? 0) + 1;
      }
    } else {
      legacySignalCount += 1;
    }
  }

  const total = signals.length;
  const coverageKind = computeGroupContextCoverageKind({
    totalSignalCount: total,
    attributedSignalCount,
    legacySignalCount,
  });

  return {
    liveTrainingSessionId: sessionId,
    teamId: liveRow.teamId,
    canonicalGroupId,
    attributionVersionUsed: LIVE_TRAINING_SESSION_GROUP_CONTEXT_ATTRIBUTION_VERSION,
    attributedSignalCount,
    legacySignalCount,
    attributedPositiveSignalCount,
    attributedNegativeSignalCount,
    attributedDomainsJson,
    coverageKind,
  };
}

// --- Stamp vs canonical re-read (internal diagnostic only; not product-facing strict group truth) ---

/**
 * Compares **current** `canonicalGroupIdForLiveSession` (re-read from DB + snapshot) to
 * `metadataJson.arenaSessionGroupId` on the **session_canonical_v1** cohort only. Legacy rows are excluded
 * from stamp analysis (not treated as mismatch).
 *
 * **Not** strict group observed truth. **Not** team planned-vs-observed. A `mismatch` / `mixed_stamps` may
 * indicate data drift, partial rollout, bad writes, or historical JSON edits — not automatically a user bug.
 */
export type LiveTrainingSessionGroupContextStampConsistencyKind =
  | "no_signals"
  | "no_attributed_signals"
  | "canonical_present_but_unstamped_only"
  | "aligned"
  | "mixed_stamps"
  | "canonical_null_but_stamped"
  | "mismatch";

export type LiveTrainingSessionGroupContextStampDiagnosticDto = {
  liveTrainingSessionId: string;
  teamId: string;
  canonicalGroupId: string | null;
  attributedSignalCount: number;
  legacySignalCount: number;
  /** Non-null `arenaSessionGroupId` values among attributed signals, sorted, deduped. */
  distinctStampedGroupIds: string[];
  /** True if at least one attributed signal has null / empty / missing `arenaSessionGroupId`. */
  stampedNullPresent: boolean;
  consistencyKind: LiveTrainingSessionGroupContextStampConsistencyKind;
  /** Short internal hint when kind is not `aligned` or `no_signals`. */
  consistencyNote?: string;
};

/** Pure: canonical vs stamped cohort (same rules as `getLiveTrainingSessionGroupContextStampDiagnostic`). */
export function computeStampConsistencyKind(input: {
  totalSignalCount: number;
  attributedSignalCount: number;
  legacySignalCount: number;
  canonicalGroupId: string | null;
  stampedNullPresent: boolean;
  /** Deduped non-null stamped ids (cardinality = `nonNullStampIds.size` in the diagnostic loop). */
  distinctNonNullStampedGroupIds: string[];
}): { consistencyKind: LiveTrainingSessionGroupContextStampConsistencyKind; consistencyNote?: string } {
  const {
    totalSignalCount: total,
    attributedSignalCount,
    legacySignalCount,
    canonicalGroupId,
    stampedNullPresent,
    distinctNonNullStampedGroupIds,
  } = input;

  let consistencyKind: LiveTrainingSessionGroupContextStampConsistencyKind;
  let consistencyNote: string | undefined;

  if (total === 0) {
    consistencyKind = "no_signals";
  } else if (attributedSignalCount === 0) {
    if (canonicalGroupId !== null && legacySignalCount > 0) {
      consistencyKind = "canonical_present_but_unstamped_only";
      consistencyNote = "canonical_non_null_all_signals_legacy";
    } else {
      consistencyKind = "no_attributed_signals";
      consistencyNote = legacySignalCount > 0 ? "legacy_cohort_only" : undefined;
    }
  } else {
    const stampCategoryCount = (stampedNullPresent ? 1 : 0) + distinctNonNullStampedGroupIds.length;

    if (stampCategoryCount > 1) {
      consistencyKind = "mixed_stamps";
      consistencyNote = `stamp_categories=${stampCategoryCount}`;
    } else if (stampedNullPresent && distinctNonNullStampedGroupIds.length === 0) {
      if (canonicalGroupId === null) {
        consistencyKind = "aligned";
      } else {
        consistencyKind = "mismatch";
        consistencyNote = "stamped_null_canonical_non_null";
      }
    } else if (distinctNonNullStampedGroupIds.length === 1) {
      const only = distinctNonNullStampedGroupIds[0]!;
      if (canonicalGroupId === null) {
        consistencyKind = "canonical_null_but_stamped";
        consistencyNote = `stamped=${only}`;
      } else if (only === canonicalGroupId) {
        consistencyKind = "aligned";
      } else {
        consistencyKind = "mismatch";
        consistencyNote = "stamped_id_differs_from_canonical";
      }
    } else {
      consistencyKind = "aligned";
    }
  }

  return { consistencyKind, ...(consistencyNote ? { consistencyNote } : {}) };
}

export async function getLiveTrainingSessionGroupContextStampDiagnostic(
  liveTrainingSessionId: string
): Promise<LiveTrainingSessionGroupContextStampDiagnosticDto | null> {
  const sessionId = liveTrainingSessionId.trim();
  if (!sessionId) return null;

  const basis = await loadLiveRowWithCanonicalGroupId(sessionId);
  if (!basis) return null;
  const { liveRow, canonicalGroupId } = basis;

  const signals = await prisma.liveTrainingPlayerSignal.findMany({
    where: { liveTrainingSessionId: sessionId },
    select: { metadataJson: true },
  });

  let attributedSignalCount = 0;
  let legacySignalCount = 0;
  const nonNullStampIds = new Set<string>();
  let stampedNullPresent = false;

  for (const s of signals) {
    if (isSessionCanonicalV1Attributed(s.metadataJson)) {
      attributedSignalCount += 1;
      const sid = stampedArenaSessionGroupIdFromMetadata(s.metadataJson);
      if (sid === null) {
        stampedNullPresent = true;
      } else {
        nonNullStampIds.add(sid);
      }
    } else {
      legacySignalCount += 1;
    }
  }

  const distinctStampedGroupIds = Array.from(nonNullStampIds).sort();
  const total = signals.length;

  const { consistencyKind, consistencyNote } = computeStampConsistencyKind({
    totalSignalCount: total,
    attributedSignalCount,
    legacySignalCount,
    canonicalGroupId,
    stampedNullPresent,
    distinctNonNullStampedGroupIds: distinctStampedGroupIds,
  });

  return {
    liveTrainingSessionId: sessionId,
    teamId: liveRow.teamId,
    canonicalGroupId,
    attributedSignalCount,
    legacySignalCount,
    distinctStampedGroupIds,
    stampedNullPresent,
    consistencyKind,
    ...(consistencyNote ? { consistencyNote } : {}),
  };
}
