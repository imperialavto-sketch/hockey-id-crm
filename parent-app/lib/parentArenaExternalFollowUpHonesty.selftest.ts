/**
 * Run: cd parent-app && npx tsx lib/parentArenaExternalFollowUpHonesty.selftest.ts
 *
 * Regression / honesty guard for mounted parent external follow-up flow (Stage 3).
 */

import {
  classifyFollowUpPostOutcome,
  classifyFollowUpSectionBody,
  createFollowUpPostInflightGuard,
  followUpNonAutonomousOutcomeCopy,
  followUpRefreshSetsSectionLoadingState,
  FOLLOW_UP_NO_CONTEXT_EXPLAINER,
  FOLLOW_UP_PENDING_REPORT_EXPLAINER,
  shouldMountArenaFollowUpSection,
} from "@/lib/parentArenaExternalFollowUpHonesty";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function run() {
  // 1) Honest post-create: pending_active_request ≠ no_follow_up_context when rec null
  const pending = classifyFollowUpSectionBody({
    status: "ready",
    recommendation: null,
    latestExternalRequest: { id: "req-1" },
  });
  assert(pending === "pending_active_request", `expected pending, got ${pending}`);
  const noCtx = classifyFollowUpSectionBody({
    status: "ready",
    recommendation: null,
    latestExternalRequest: null,
  });
  assert(noCtx === "no_follow_up_context", `expected no_follow_up_context, got ${noCtx}`);
  assert(
    !FOLLOW_UP_PENDING_REPORT_EXPLAINER.includes("нет активного внешнего запроса"),
    "pending explainer must not read like «no active request» empty-state regression"
  );
  assert(
    FOLLOW_UP_NO_CONTEXT_EXPLAINER.includes("нет активного внешнего запроса"),
    "no-context explainer must stay explicit about missing saved-report context"
  );

  // 2) Honest success detail split — three distinct outcomes, no universal «создан цикл»
  const copies = new Set([
    followUpNonAutonomousOutcomeCopy("new"),
    followUpNonAutonomousOutcomeCopy("existing_same"),
    followUpNonAutonomousOutcomeCopy("unknown"),
  ]);
  assert(copies.size === 3, "outcome copies must be three distinct strings");
  for (const c of copies) {
    assert(
      !c.includes("Создан следующий цикл"),
      `forbidden overly-specific success regression in: ${c.slice(0, 120)}`
    );
  }
  assert(classifyFollowUpPostOutcome(undefined, "x") === "unknown", "pre-fetch fail → unknown");
  assert(classifyFollowUpPostOutcome("a", "a") === "existing_same", "same id → existing_same");
  assert(classifyFollowUpPostOutcome(null, "b") === "new", "null then new id → new");
  assert(classifyFollowUpPostOutcome("a", "b") === "new", "replaced id → new");

  // 3) Defer: section must not mount when user deferred (no empty SectionCard shell)
  assert(
    !shouldMountArenaFollowUpSection({
      idTrim: "p1",
      player: {},
      profileLoading: false,
      userDeferred: true,
    }),
    "defer must hide whole section"
  );
  assert(
    shouldMountArenaFollowUpSection({
      idTrim: "p1",
      player: {},
      profileLoading: false,
      userDeferred: false,
    }),
    "normal path mounts"
  );

  // 4) Silent refresh path must not blanket-loading the section
  assert(followUpRefreshSetsSectionLoadingState(true) === false, "silent → no section loading flip");
  assert(followUpRefreshSetsSectionLoadingState(false) === true, "loud → section loading flip");

  // 5) Non-autonomous inflight guard (same semantics as followUpPostInflight)
  const g = createFollowUpPostInflightGuard();
  assert(g.tryBegin("x") === true, "first acquire");
  assert(g.tryBegin("x") === false, "second acquire same id blocked");
  g.end("x");
  assert(g.tryBegin("x") === true, "after release");

  console.log("parentArenaExternalFollowUpHonesty.selftest: ok");
}

run();
