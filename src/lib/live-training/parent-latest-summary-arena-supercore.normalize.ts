/**
 * Arena Supercore — layer 2 for `buildParentLatestTrainingSummaryFromSources` (latest-training-summary).
 *
 * Structural (pass 3):
 * - `trainingSessionId` from `ArenaCoreFacts.canonical.linkedTrainingSessionId` when legacy omitted it.
 *
 * Semantic (pass 4, `live_session_fallback` only — не трогаем опубликованный отчёт):
 * - `developmentFocus`: дополняется строками из `ArenaCoreBindings.decisions` с kinds
 *   `arena_next_focus_column` (canonical) и `session_meaning_next_training_focus` (derived SessionMeaning),
 *   в том же порядке, что в билдере bindings. Дедуп по нормализованному тексту; лимит длины как в legacy.
 * - `shortSummary`: если остался ровно stock placeholder fallback и есть каноническая строка колонки или
 *   непустой `developmentFocus` после merge — placeholder заменяется (не подмена текста отчёта).
 *
 * Остаётся legacy/mixed: highlights, supportNotes, counters, sessionMeta, arenaSummary/guidance, parentActions,
 * published-ветка целиком, external coach, эвристика времени, тексты TrainingSessionReport.
 *
 * Explanation (pass 5, `live_session_fallback` only):
 * - `supportNotes`: дополняются строками из `ArenaCoreBindings.explanations` с `audience === "parent"`
 *   (фиксированный порядок id: опубликованный слот → смысл/analytics → черновик). Дедуп и общий лимит
 *   как у legacy (`MAX_FOCUS + 2`). Тексты только шаблонные, из `ArenaCoreFacts`.
 *
 * Записи explanations с audience internal/coach в supportNotes не маппятся.
 */

import type { ArenaCoreFacts } from "@/lib/arena/supercore/types";
import type { ArenaCoreBindings } from "@/lib/arena/supercore/bindings";
import { buildArenaCoreBindings } from "@/lib/arena/supercore/build-arena-core-bindings";
import { loadArenaCoreFacts } from "@/lib/arena/supercore/load-arena-core-facts";
import type { ParentLatestLiveTrainingSummaryDto } from "./parent-latest-live-training-summary";

/** Согласовано с `parent-latest-live-training-summary.ts`. */
const MAX_FOCUS = 2;
const MAX_SUPPORT_NOTES = MAX_FOCUS + 2;
const MAX_LINE = 220;
const MAX_SHORT = 180;

/** Порядок слияния в supportNotes — совпадает с id в `build-arena-core-bindings.ts`. */
const PARENT_EXPL_IDS_FOR_SUPPORT_NOTES = [
  "expl_parent_published_slot",
  "expl_parent_meaning_inputs",
  "expl_parent_analytics_only",
  "expl_parent_report_draft",
] as const;

const LIVE_FALLBACK_SHORT_SOURCE =
  "Сводка по последней тренировке (отчёт тренера ещё не опубликован).";

function truncateLine(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function normalizeFocusKey(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Строки фокуса в порядке приоритета supercore decisions (только безопасные kinds для родителя). */
export function extractOrderedDevelopmentFocusLinesFromBindings(
  bindings: ArenaCoreBindings
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    const t = truncateLine(raw, MAX_LINE);
    const k = normalizeFocusKey(t);
    if (!k || seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };
  for (const d of bindings.decisions) {
    if (d.kind === "arena_next_focus_column") push(d.text);
  }
  for (const d of bindings.decisions) {
    if (d.kind === "session_meaning_next_training_focus") push(d.text);
  }
  return out;
}

/**
 * Дополняет legacy `developmentFocus` строками из bindings; порядок: сначала legacy (дедуп),
 * затем строки из bindings, которых ещё нет. Обрезка по `maxFocus`.
 */
export function mergeDevelopmentFocusWithSupercoreDecisions(params: {
  current: string[];
  bindings: ArenaCoreBindings;
  maxFocus: number;
}): string[] {
  const { current, bindings, maxFocus } = params;
  const candidates = extractOrderedDevelopmentFocusLinesFromBindings(bindings);
  const keySet = new Set<string>();
  const out: string[] = [];

  const pushLine = (raw: string) => {
    const t = truncateLine(raw, MAX_LINE);
    const k = normalizeFocusKey(t);
    if (!k || keySet.has(k) || out.length >= maxFocus) return;
    keySet.add(k);
    out.push(t);
  };

  for (const line of current) {
    pushLine(line);
  }
  for (const c of candidates) {
    pushLine(c);
  }

  return out;
}

type HasDataTrue = Extract<ParentLatestLiveTrainingSummaryDto, { hasData: true }>;

/** Строки parent-explanation из bindings в фиксированном порядке (только `audience === "parent"`). */
export function collectParentExplanationLinesForSupportNotes(
  bindings: ArenaCoreBindings
): string[] {
  const parents = bindings.explanations.filter((e) => e.audience === "parent");
  const byId = new Map(parents.map((e) => [e.id, truncateLine(e.text, MAX_LINE)]));
  const lines: string[] = [];
  for (const id of PARENT_EXPL_IDS_FOR_SUPPORT_NOTES) {
    const t = byId.get(id)?.trim();
    if (t) lines.push(t);
  }
  return lines;
}

/**
 * Сохраняет legacy supportNotes, затем добавляет parent-explanation из bindings до `maxNotes`, с дедупом.
 */
export function mergeSupportNotesWithParentExplanations(params: {
  current: string[];
  bindings: ArenaCoreBindings;
  maxNotes: number;
}): string[] {
  const { current, bindings, maxNotes } = params;
  const additions = collectParentExplanationLinesForSupportNotes(bindings);
  const keySet = new Set(current.map((s) => normalizeFocusKey(s)));
  const out = [...current];
  for (const a of additions) {
    if (out.length >= maxNotes) break;
    const k = normalizeFocusKey(a);
    if (keySet.has(k)) continue;
    keySet.add(k);
    out.push(a);
  }
  return out.slice(0, maxNotes);
}

/** Только `live_session_fallback` + stock placeholder; приоритет канонической колонки, затем первый фокус после merge. */
export function maybeUpgradeLiveFallbackPlaceholderShortSummary(
  payload: HasDataTrue,
  facts: ArenaCoreFacts
): string {
  const placeholder = truncateLine(LIVE_FALLBACK_SHORT_SOURCE, MAX_SHORT);
  if (payload.shortSummary !== placeholder) return payload.shortSummary;

  const arena = facts.canonical.arenaNextFocusLine?.trim();
  if (arena) return truncateLine(arena, MAX_SHORT);

  const firstFocus = payload.developmentFocus.map((s) => s.trim()).find(Boolean);
  if (firstFocus) return truncateLine(firstFocus, MAX_SHORT);

  return payload.shortSummary;
}

/** Pure merge for tests and for the async enricher below. */
export function applySupercoreLinkedTrainingSessionIdToParentSummary(
  payload: ParentLatestLiveTrainingSummaryDto,
  linkedTrainingSessionId: string | null
): ParentLatestLiveTrainingSummaryDto {
  if (!payload.hasData || !linkedTrainingSessionId?.trim()) return payload;
  const linked = linkedTrainingSessionId.trim();
  const current = payload.trainingSessionId;
  if (current != null && String(current).trim() !== "") {
    if (String(current).trim() !== linked) return payload;
    return payload;
  }
  return { ...payload, trainingSessionId: linked };
}

/** Fallback-only: `ArenaCoreBindings` → developmentFocus / shortSummary / supportNotes (facts + bindings). */
function applySupercoreFallbackSemanticFromBindings(params: {
  payload: HasDataTrue;
  facts: ArenaCoreFacts;
  bindings: ArenaCoreBindings;
}): HasDataTrue {
  const { payload, facts, bindings } = params;
  let out: HasDataTrue = {
    ...payload,
    developmentFocus: mergeDevelopmentFocusWithSupercoreDecisions({
      current: payload.developmentFocus,
      bindings,
      maxFocus: MAX_FOCUS,
    }),
  };
  out = {
    ...out,
    shortSummary: maybeUpgradeLiveFallbackPlaceholderShortSummary(out, facts),
  };
  out = {
    ...out,
    supportNotes: mergeSupportNotesWithParentExplanations({
      current: out.supportNotes,
      bindings,
      maxNotes: MAX_SUPPORT_NOTES,
    }),
  };
  return out;
}

async function loadArenaCoreSnapshotForLiveSession(
  liveTrainingSessionId: string
): Promise<{ facts: ArenaCoreFacts; bindings: ArenaCoreBindings } | null> {
  const facts = await loadArenaCoreFacts({ liveTrainingSessionId });
  if (!facts) return null;
  return { facts, bindings: buildArenaCoreBindings(facts) };
}

/**
 * Слой supercore поверх уже собранного base DTO: один load facts + один build bindings.
 * Structural merge для любой ветки с `hasData`; semantic — только `live_session_fallback`.
 */
export async function applySupercoreLayerToParentLatestTrainingSummary(params: {
  basePayload: ParentLatestLiveTrainingSummaryDto;
  liveTrainingSessionId: string | null;
}): Promise<ParentLatestLiveTrainingSummaryDto> {
  const { basePayload, liveTrainingSessionId } = params;
  if (!basePayload.hasData || !liveTrainingSessionId?.trim()) return basePayload;

  const snapshot = await loadArenaCoreSnapshotForLiveSession(liveTrainingSessionId.trim());
  if (!snapshot) return basePayload;

  const { facts, bindings } = snapshot;

  let out: ParentLatestLiveTrainingSummaryDto = applySupercoreLinkedTrainingSessionIdToParentSummary(
    basePayload,
    facts.canonical.linkedTrainingSessionId
  );

  if (!out.hasData) return out;

  if (out.source === "live_session_fallback") {
    out = applySupercoreFallbackSemanticFromBindings({ payload: out, facts, bindings });
  }

  return out;
}
