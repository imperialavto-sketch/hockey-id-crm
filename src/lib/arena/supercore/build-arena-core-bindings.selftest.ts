/**
 * Validates `buildArenaCoreBindings` on structural mocks (no production route changes).
 * Run: npx tsx src/lib/arena/supercore/build-arena-core-bindings.selftest.ts
 */

import { LiveTrainingMode, LiveTrainingSessionStatus } from "@prisma/client";
import { buildArenaCoreBindings } from "./build-arena-core-bindings";
import type { ArenaCoreFacts } from "./types";
import type { SessionMeaning } from "@/lib/live-training/session-meaning";
import { SESSION_MEANING_VERSION } from "@/lib/live-training/session-meaning";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function baseFacts(
  overrides: Partial<{ arenaNextFocusLine: string | null; sessionMeaning: SessionMeaning | null }> = {}
): ArenaCoreFacts {
  const sid = "sess_selftest";
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
      liveTrainingSessionId: sid,
      coachId: "c1",
      teamId: "t1",
      teamName: "Team",
      mode: LiveTrainingMode.ice,
      status: LiveTrainingSessionStatus.confirmed,
      trainingSessionIdColumn: "ts1",
      linkedTrainingSessionId: "ts1",
      startedAt: new Date().toISOString(),
      endedAt: null,
      confirmedAt: new Date().toISOString(),
      arenaNextFocusLine: overrides.arenaNextFocusLine ?? null,
      arenaNextFocusAppliedAt: null,
      arenaNextFocusTargetTrainingSessionId: null,
      counts: { liveTrainingEvents: 2, liveTrainingPlayerSignals: 1, liveTrainingObservationDraftsActive: 1 },
      reportDraft: { id: "draft1", status: "draft", publishedAt: null },
      publishedTrainingSessionReport: {
        trainingSessionId: "ts1",
        reportId: "rep1",
        hasPublishedText: true,
      },
    },
    derived: {
      tier: "derived",
      sessionMeaning: overrides.sessionMeaning ?? null,
      planningSnapshot: null,
      analyticsSummary: {
        signalCount: 1,
        draftsWithPlayerCount: 1,
        playersWithSignals: 1,
      },
    },
  };
}

function minimalSessionMeaning(sid: string): SessionMeaning {
  return {
    version: SESSION_MEANING_VERSION,
    builtAt: new Date().toISOString(),
    context: {
      liveTrainingSessionId: sid,
      teamId: "t1",
      teamName: "Team",
      status: "confirmed",
      mode: "ice",
      trainingSessionId: "ts1",
      startedAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
    },
    themes: [{ key: "skating", weight: 0.8, sources: ["draft_category"] }],
    focus: [{ label: "Старт", weight: 0.5 }],
    team: {
      signalTotals: { positive: 1, negative: 0, neutral: 0 },
      needsAttentionLines: ["Внимание к борьбе"],
      positiveLines: ["Хороший темп"],
    },
    players: [],
    confidence: {
      overall: 0.7,
      hasConfirmedSignals: true,
      eventCount: 2,
      draftCount: 1,
      signalCount: 1,
    },
    nextActions: {
      team: ["Собрать команду на разминке"],
      players: [{ playerId: "p1", playerName: "Иван", actions: ["Повторить старт"] }],
      nextTrainingFocus: ["Скорость первых шагов"],
    },
    actionTriggers: [
      { type: "attention_required", target: "team", reason: "Низкая стабильность по теме" },
    ],
  };
}

function run(): void {
  const sid = "sess_selftest";

  const b0 = buildArenaCoreBindings(baseFacts({ sessionMeaning: null, arenaNextFocusLine: null }));
  assert(b0.interpretations.length === 0, "no session meaning → no theme/focus interpretations");
  assert(b0.decisions.length === 0, "no meaning and no arena column → no decisions");
  assert(
    b0.explanations.some((e) => e.kind === "analytics_counts_profile"),
    "analytics explanation always"
  );
  assert(
    b0.explanations.some((e) => e.kind === "published_report_presence" && e.supportedByTier === "canonical"),
    "published explanation when report present"
  );
  assert(
    b0.explanations.every((e) => e.supportedByTier === "canonical" || e.supportedByTier === "derived"),
    "explanation tier is canonical or derived only"
  );
  for (const p of b0.explanations) {
    if (p.kind === "published_report_presence" && p.audience === "coach") {
      assert(p.supportedByTier === "canonical", "published presence must be canonical tier");
      assert(
        p.factRefs.some((r) => r.kind === "published_training_session_report"),
        "coach published explanation must ref report"
      );
    }
  }

  const parent0 = b0.explanations.filter((e) => e.audience === "parent");
  assert(parent0.length >= 3, "parent: published slot + analytics + draft when draft present");
  assert(
    parent0.some((e) => e.id === "expl_parent_published_slot" && e.kind === "published_report_presence"),
    "parent published-slot explanation"
  );
  assert(
    parent0.some((e) => e.id === "expl_parent_analytics_only" && e.kind === "analytics_counts_profile"),
    "parent analytics when no session meaning"
  );
  assert(
    parent0.some((e) => e.id === "expl_parent_report_draft" && e.kind === "report_draft_state"),
    "parent draft explanation when draft row exists"
  );

  const b1 = buildArenaCoreBindings(
    baseFacts({ arenaNextFocusLine: "Работа над стартом", sessionMeaning: minimalSessionMeaning(sid) })
  );
  assert(b1.interpretations.length >= 3, "themes + focus + team lines");
  assert(
    b1.interpretations.every((i) => i.supportedByTier === "derived"),
    "interpretations must not claim canonical"
  );
  assert(
    b1.interpretations.every((i) => i.factRefs.some((r) => r.kind === "parsed_session_meaning")),
    "interpretations must anchor parsed_session_meaning"
  );
  const colDec = b1.decisions.find((d) => d.kind === "arena_next_focus_column");
  assert(Boolean(colDec), "arena column focus produces decision");
  assert(colDec!.supportedByTier === "canonical", "column decision is canonical");
  assert(
    colDec!.factRefs.some((r) => r.kind === "arena_next_focus_column"),
    "column decision refs arena_next_focus_column"
  );
  const derivedDec = b1.decisions.filter((d) => d.kind === "session_meaning_next_training_focus");
  assert(derivedDec.length >= 1, "next training focus from meaning");
  assert(
    derivedDec.every((d) => d.supportedByTier === "derived"),
    "meaning-sourced decisions are derived tier"
  );
  assert(
    derivedDec.every((d) => d.factRefs.some((r) => r.kind === "parsed_session_meaning")),
    "meaning decisions must ref parsed_session_meaning"
  );

  const parent1 = b1.explanations.filter((e) => e.audience === "parent");
  assert(
    parent1.some((e) => e.id === "expl_parent_meaning_inputs" && e.kind === "session_meaning_confidence_profile"),
    "parent meaning-input explanation when session meaning exists"
  );
  assert(
    !parent1.some((e) => e.id === "expl_parent_analytics_only"),
    "no parent analytics-only row when session meaning provides expl_parent_meaning_inputs"
  );

  console.log("[buildArenaCoreBindings selftest] OK");
}

run();
