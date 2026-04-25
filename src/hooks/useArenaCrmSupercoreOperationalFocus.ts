"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ArenaCrmSupercoreOperationalFocusLine,
  ArenaPlayerSnapshot,
  ArenaTeamSnapshot,
} from "@/lib/arena/crm/arenaCrmTypes";
import type { ArenaCrmGroupSnapshotWireRow } from "@/lib/arena/crm/arenaCrmOperationalFocusWire";
import {
  resolveArenaCrmWireFetchOutcome,
  type ArenaCrmWireStatus,
} from "@/lib/arena/crm/arena-crm-wire-classifier";

export type { ArenaCrmWireStatus } from "@/lib/arena/crm/arena-crm-wire-classifier";

/**
 * CRM Arena HTTP wire: явное состояние, чтобы секции не исчезали молча при сбое или загрузке.
 * Классификация fetch → `wireStatus`: `resolveArenaCrmWireFetchOutcome` (единый контракт со selftest).
 */

function wireValueIdle(): ArenaCrmSnapshotWireHookValue {
  return {
    wireStatus: "idle",
    supercoreOperationalFocus: undefined,
    playerSnapshot: undefined,
    teamSnapshot: undefined,
    groupArenaSnapshots: undefined,
  };
}

function wireValueLoading(): ArenaCrmSnapshotWireHookValue {
  return {
    wireStatus: "loading",
    supercoreOperationalFocus: undefined,
    playerSnapshot: undefined,
    teamSnapshot: undefined,
    groupArenaSnapshots: undefined,
  };
}

function wireValueError(): ArenaCrmSnapshotWireHookValue {
  return {
    wireStatus: "error",
    supercoreOperationalFocus: undefined,
    playerSnapshot: undefined,
    teamSnapshot: undefined,
    groupArenaSnapshots: undefined,
  };
}

/**
 * Frozen local CRM pattern: loads read-only Arena CRM wire from
 * `/api/players/[id]/arena-crm-snapshot` or `/api/teams/[id]/arena-crm-snapshot` only.
 * Один fetch: `supercoreOperationalFocus` + опциональные snapshot-секции.
 */
export type ArenaCrmSnapshotWireHookValue = {
  wireStatus: ArenaCrmWireStatus;
  supercoreOperationalFocus: ArenaCrmSupercoreOperationalFocusLine[] | undefined;
  playerSnapshot: ArenaPlayerSnapshot | null | undefined;
  teamSnapshot: ArenaTeamSnapshot | null | undefined;
  /** Team `arena-crm-snapshot` only; пустой массив после успешного ответа без строк групп. */
  groupArenaSnapshots: ArenaCrmGroupSnapshotWireRow[] | undefined;
};

export function useArenaCrmSupercoreOperationalFocus(
  snapshotUrl: string | null,
  reloadKey: number
): ArenaCrmSnapshotWireHookValue {
  const [value, setValue] = useState<ArenaCrmSnapshotWireHookValue>(() =>
    snapshotUrl ? wireValueLoading() : wireValueIdle()
  );
  const fetchSeqRef = useRef(0);

  useEffect(() => {
    if (!snapshotUrl) {
      setValue(wireValueIdle());
      return;
    }
    setValue(wireValueLoading());
    const seq = ++fetchSeqRef.current;
    const ac = new AbortController();

    fetch(snapshotUrl, { credentials: "include", signal: ac.signal })
      .then(async (r) => {
        if (fetchSeqRef.current !== seq) return;
        const raw: unknown = await r.json().catch(() => null);
        if (fetchSeqRef.current !== seq) return;
        const outcome = resolveArenaCrmWireFetchOutcome(r.ok, raw);
        if (outcome.wireStatus === "error") {
          setValue(wireValueError());
          return;
        }
        const parsed = outcome.parsed;
        setValue({
          wireStatus: outcome.wireStatus,
          supercoreOperationalFocus: parsed.supercoreOperationalFocus,
          playerSnapshot: parsed.playerSnapshot ?? null,
          teamSnapshot: parsed.teamSnapshot ?? null,
          groupArenaSnapshots: parsed.groupArenaSnapshots ?? [],
        });
      })
      .catch((err: unknown) => {
        const aborted =
          err instanceof DOMException
            ? err.name === "AbortError"
            : err instanceof Error && err.name === "AbortError";
        if (aborted) return;
        if (fetchSeqRef.current !== seq) return;
        setValue(wireValueError());
      });

    return () => ac.abort();
  }, [snapshotUrl, reloadKey]);

  return value;
}
