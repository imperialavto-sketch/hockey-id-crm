/**
 * Supercore normalization for latest-training-summary (structural + semantic), no DB.
 * Run: `npm run test:parent-summary-supercore-pilot`
 */

import { LiveTrainingMode, LiveTrainingSessionStatus } from "@prisma/client";
import type { ArenaCoreBindings } from "@/lib/arena/supercore/bindings";
import type { ArenaCoreFacts } from "@/lib/arena/supercore/types";
import {
  applySupercoreLinkedTrainingSessionIdToParentSummary,
  collectParentExplanationLinesForSupportNotes,
  extractOrderedDevelopmentFocusLinesFromBindings,
  mergeDevelopmentFocusWithSupercoreDecisions,
  mergeSupportNotesWithParentExplanations,
  maybeUpgradeLiveFallbackPlaceholderShortSummary,
} from "./parent-latest-summary-arena-supercore.normalize";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const emptyRefs = [] as const;

const explBindings: ArenaCoreBindings = {
  version: "1",
  interpretations: [],
  decisions: [],
  explanations: [
    {
      id: "expl_parent_published_slot",
      kind: "published_report_presence",
      audience: "parent",
      text: "Родительская строка про отчёт.",
      supportedByTier: "canonical",
      factRefs: emptyRefs,
    },
    {
      id: "expl_parent_analytics_only",
      kind: "analytics_counts_profile",
      audience: "parent",
      text: "Родительская строка про агрегаты.",
      supportedByTier: "derived",
      factRefs: emptyRefs,
    },
  ],
  notes: [],
};

const mockBindings: ArenaCoreBindings = {
  version: "1",
  interpretations: [],
  decisions: [
    {
      id: "d_arena",
      kind: "arena_next_focus_column",
      text: "Канон фокус",
      supportedByTier: "canonical",
      factRefs: emptyRefs,
    },
    {
      id: "d_next",
      kind: "session_meaning_next_training_focus",
      text: "Фокус следующей тренировки",
      supportedByTier: "derived",
      factRefs: emptyRefs,
    },
  ],
  explanations: [],
  notes: [],
};

function factsWithArenaLine(line: string | null): ArenaCoreFacts {
  return {
    meta: {
      version: "1",
      notes: [],
      excluded: {
        externalTrainingContour: true,
        parentMixedReadModels: true,
        loadEnrichedLiveTrainingDraftsForSession: true,
      },
    },
    canonical: {
      tier: "canonical",
      liveTrainingSessionId: "live-1",
      coachId: "c",
      teamId: "t",
      teamName: null,
      mode: LiveTrainingMode.ice,
      status: LiveTrainingSessionStatus.live,
      trainingSessionIdColumn: null,
      linkedTrainingSessionId: null,
      startedAt: new Date(0).toISOString(),
      endedAt: null,
      confirmedAt: null,
      arenaNextFocusLine: line,
      arenaNextFocusAppliedAt: null,
      arenaNextFocusTargetTrainingSessionId: null,
      counts: { liveTrainingEvents: 0, liveTrainingPlayerSignals: 0, liveTrainingObservationDraftsActive: 0 },
      reportDraft: null,
      publishedTrainingSessionReport: null,
    },
    derived: {
      tier: "derived",
      sessionMeaning: null,
      planningSnapshot: null,
      analyticsSummary: {
        signalCount: 0,
        draftsWithPlayerCount: 0,
        playersWithSignals: 0,
      },
    },
  } satisfies ArenaCoreFacts;
}

const baseTrue = {
  hasData: true as const,
  source: "live_session_fallback" as const,
  isPublished: false,
  sessionMeta: { teamLabel: "T", modeLabel: "Лёд", dateLabel: "1 января 2026 г." },
  counters: { totalSignals: 0, positiveCount: 0, negativeCount: 0, neutralCount: 0 },
  highlights: [] as string[],
  developmentFocus: [] as string[],
  supportNotes: [] as string[],
  shortSummary: "x",
};

function run() {
  const explLines = collectParentExplanationLinesForSupportNotes(explBindings);
  assert(explLines.length === 2 && explLines[0]?.includes("отчёт"), "parent expl order");

  const mergedNotes = mergeSupportNotesWithParentExplanations({
    current: ["Legacy note"],
    bindings: explBindings,
    maxNotes: 4,
  });
  assert(
    mergedNotes.length === 3 &&
      mergedNotes[0] === "Legacy note" &&
      mergedNotes[1]?.includes("отчёт"),
    "supportNotes: legacy then parent expl"
  );

  const cap = mergeSupportNotesWithParentExplanations({
    current: ["A", "B", "C", "D"],
    bindings: explBindings,
    maxNotes: 4,
  });
  assert(cap.length === 4 && cap.every((x, i) => ["A", "B", "C", "D"][i] === x), "no overflow past maxNotes");

  const ordered = extractOrderedDevelopmentFocusLinesFromBindings(mockBindings);
  assert(ordered.length === 2 && ordered[0] === "Канон фокус", "binding order: arena then next focus");

  const merged = mergeDevelopmentFocusWithSupercoreDecisions({
    current: ["Legacy"],
    bindings: mockBindings,
    maxFocus: 2,
  });
  assert(merged[0] === "Legacy" && merged[1] === "Канон фокус", "legacy first then binding");

  const mergedCap = mergeDevelopmentFocusWithSupercoreDecisions({
    current: ["A", "B"],
    bindings: mockBindings,
    maxFocus: 2,
  });
  assert(mergedCap.length === 2 && mergedCap[0] === "A" && mergedCap[1] === "B", "maxFocus caps");

  const placeholderPayload = {
    ...baseTrue,
    shortSummary: "Сводка по последней тренировке (отчёт тренера ещё не опубликован).",
  };
  const shortFromArena = maybeUpgradeLiveFallbackPlaceholderShortSummary(
    placeholderPayload,
    factsWithArenaLine("Строка колонки")
  );
  assert(shortFromArena === "Строка колонки", "placeholder → arena column");

  const shortFromFocus = maybeUpgradeLiveFallbackPlaceholderShortSummary(
    { ...placeholderPayload, developmentFocus: ["Из фокуса"] },
    factsWithArenaLine(null)
  );
  assert(shortFromFocus === "Из фокуса", "placeholder → first developmentFocus");

  const noSlot = applySupercoreLinkedTrainingSessionIdToParentSummary(
    { ...baseTrue },
    "slot-from-supercore"
  );
  assert(noSlot.hasData && noSlot.trainingSessionId === "slot-from-supercore", "fill when missing");

  const keepLegacy = applySupercoreLinkedTrainingSessionIdToParentSummary(
    { ...baseTrue, trainingSessionId: "legacy-slot" },
    "other-slot"
  );
  assert(
    keepLegacy.hasData && keepLegacy.trainingSessionId === "legacy-slot",
    "keep legacy when already set"
  );

  const falsePayload = applySupercoreLinkedTrainingSessionIdToParentSummary({ hasData: false }, "x");
  assert(falsePayload.hasData === false, "no data unchanged");

  console.log("parent-latest-summary-arena-supercore.normalize.selftest: ok");
}

run();
