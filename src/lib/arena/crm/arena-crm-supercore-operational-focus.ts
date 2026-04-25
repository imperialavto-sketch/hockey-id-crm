/**
 * CRM operational focus (supercore pass 9): lines for `ArenaCrmSnapshot.supercoreOperationalFocus`
 * from a single confirmed live session (team-scoped in loaders).
 *
 * Chain: `ArenaCoreFacts` → `ArenaCoreBindings` → `ArenaActionEnvelope` (audience `crm`) →
 * `ArenaCrmSupercoreOperationalFocusLine`.
 */

import type { ArenaActionEnvelope } from "@/lib/arena/supercore/actions";
import { arenaFocusBindingDecisionsToActionEnvelopes } from "@/lib/arena/supercore/actions";
import { buildArenaCoreBindings } from "@/lib/arena/supercore/build-arena-core-bindings";
import { loadArenaCoreFacts } from "@/lib/arena/supercore/load-arena-core-facts";
import type { ArenaCrmSupercoreOperationalFocusLine } from "./arenaCrmTypes";

/** Pure adapter for tests and deterministic mapping. */
export function arenaActionEnvelopesToCrmSupercoreOperationalFocusLines(
  envelopes: ArenaActionEnvelope[],
  liveTrainingSessionId: string
): ArenaCrmSupercoreOperationalFocusLine[] {
  return envelopes.map((e) => ({
    title: e.title,
    body: e.body,
    liveTrainingSessionId,
    bindingDecisionId: e.refs.bindingDecisionId,
  }));
}

/** Read-only: same focus-decision subset as coach action-candidates merge; CRM audience on envelopes. */
export async function loadArenaCrmSupercoreOperationalFocusLinesForLiveSession(
  liveTrainingSessionId: string | null
): Promise<ArenaCrmSupercoreOperationalFocusLine[]> {
  if (!liveTrainingSessionId?.trim()) return [];
  const sid = liveTrainingSessionId.trim();
  const facts = await loadArenaCoreFacts({ liveTrainingSessionId: sid });
  if (!facts) return [];
  const bindings = buildArenaCoreBindings(facts);
  const envelopes = arenaFocusBindingDecisionsToActionEnvelopes(bindings, sid, "crm");
  return arenaActionEnvelopesToCrmSupercoreOperationalFocusLines(envelopes, sid);
}
