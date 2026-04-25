/**
 * Coach/CRM pilot (supercore pass 7 + 8): дополняет список action candidates из supercore.
 *
 * Internal chain (pass 8): `ArenaCoreBindings.decisions` → `ArenaActionEnvelope` → `LiveTrainingActionCandidateDto`.
 *
 * Id кандидатов: `ltac:s:${sessionId}:supercore:${bindingDecisionId}` — префикс для `materializeSessionLiveTrainingActionCandidate`.
 * Дедуп по нормализованному `title` относительно уже собранных items (legacy + meaning MVP).
 */

import type { ArenaCoreBindings } from "./bindings";
import { buildArenaCoreBindings } from "./build-arena-core-bindings";
import { loadArenaCoreFacts } from "./load-arena-core-facts";
import {
  arenaActionEnvelopeToLiveTrainingActionCandidateDto,
  arenaFocusBindingDecisionsToActionEnvelopes,
} from "./actions";
import type { LiveTrainingActionCandidateDto } from "@/lib/live-training/live-training-action-candidate-types";
import type { LiveTrainingSessionOutcomeDto } from "@/lib/live-training/live-training-session-outcome";

function normalizeTitleKey(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Sync merge при уже загруженных bindings (тесты, повторное использование). */
export function mergeSupercoreFocusBindingDecisionsIntoActionCandidates(params: {
  items: LiveTrainingActionCandidateDto[];
  bindings: ArenaCoreBindings;
  sessionId: string;
  sessionStartedAt: string;
  outcome: LiveTrainingSessionOutcomeDto;
}): LiveTrainingActionCandidateDto[] {
  const { items, bindings, sessionId, sessionStartedAt, outcome } = params;
  const keys = new Set(items.map((i) => normalizeTitleKey(i.title)));
  const envelopes = arenaFocusBindingDecisionsToActionEnvelopes(bindings, sessionId, "coach");
  const additions: LiveTrainingActionCandidateDto[] = [];

  for (const env of envelopes) {
    const dto = arenaActionEnvelopeToLiveTrainingActionCandidateDto(env, {
      sessionId,
      sessionStartedAt,
      outcome,
    });
    const k = normalizeTitleKey(dto.title);
    if (!k || keys.has(k)) continue;
    keys.add(k);
    additions.push(dto);
  }

  return [...items, ...additions];
}

/** Один load facts + bindings на вызов; при отсутствии сессии в БД возвращает `items` без изменений. */
export async function augmentLiveTrainingSessionActionCandidatesWithSupercore(params: {
  items: LiveTrainingActionCandidateDto[];
  sessionId: string;
  sessionStartedAt: string;
  outcome: LiveTrainingSessionOutcomeDto;
}): Promise<LiveTrainingActionCandidateDto[]> {
  const facts = await loadArenaCoreFacts({ liveTrainingSessionId: params.sessionId });
  if (!facts) return params.items;
  const bindings = buildArenaCoreBindings(facts);
  return mergeSupercoreFocusBindingDecisionsIntoActionCandidates({
    items: params.items,
    bindings,
    sessionId: params.sessionId,
    sessionStartedAt: params.sessionStartedAt,
    outcome: params.outcome,
  });
}
