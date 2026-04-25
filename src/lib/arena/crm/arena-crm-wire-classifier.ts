import {
  parseArenaCrmOperationalFocusWireResponse,
  type ArenaCrmOperationalFocusWireJson,
} from "./arenaCrmOperationalFocusWire";

/**
 * CRM Arena HTTP wire — детерминированная классификация состояния (без fetch).
 * Хук `useArenaCrmSupercoreOperationalFocus` и selftest должны опираться на один и тот же контракт.
 */
export type ArenaCrmWireStatus = "idle" | "loading" | "error" | "empty" | "success";

/** Видимый payload wire после успешного парсинга (контракт non-empty). */
export function arenaCrmWirePayloadIsNonEmpty(parsed: ArenaCrmOperationalFocusWireJson): boolean {
  return (
    parsed.supercoreOperationalFocus.length > 0 ||
    parsed.playerSnapshot != null ||
    parsed.teamSnapshot != null ||
    (parsed.groupArenaSnapshots?.length ?? 0) > 0
  );
}

/**
 * Итог fetch `arena-crm-snapshot` без сетевого слоя: только HTTP ok + тело.
 * - !httpOk → error (не empty)
 * - httpOk + parse null → error (не empty)
 * - httpOk + parse ok + !isNonEmpty → empty (не success)
 * - иначе success
 */
export type ArenaCrmWireFetchResolution =
  | { wireStatus: "error"; parsed: null }
  | { wireStatus: "empty"; parsed: ArenaCrmOperationalFocusWireJson }
  | { wireStatus: "success"; parsed: ArenaCrmOperationalFocusWireJson };

export function resolveArenaCrmWireFetchOutcome(
  httpOk: boolean,
  rawJson: unknown
): ArenaCrmWireFetchResolution {
  if (!httpOk) return { wireStatus: "error", parsed: null };
  const parsed = parseArenaCrmOperationalFocusWireResponse(rawJson);
  if (!parsed) return { wireStatus: "error", parsed: null };
  if (!arenaCrmWirePayloadIsNonEmpty(parsed)) return { wireStatus: "empty", parsed };
  return { wireStatus: "success", parsed };
}

/** Семантика `CrmArenaSnapshotWireRegion`: idle скрыт; success → children; остальное → notice. */
export type ArenaCrmSnapshotWireRegionKind = "hidden" | "notice" | "success";

export function mapArenaCrmWireStatusToRegionKind(
  status: ArenaCrmWireStatus
): ArenaCrmSnapshotWireRegionKind {
  if (status === "idle") return "hidden";
  if (status === "success") return "success";
  return "notice";
}
