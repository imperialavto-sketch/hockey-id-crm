/**
 * Run: npx tsx src/lib/arena/parent-facing-trust-wording-slice.selftest.ts
 *
 * Regression guard for closed parent-facing trust wording slice (server lib).
 */

import { composePlayerDevelopmentOverviewForRegressionGuard } from "@/lib/arena/build-player-development-overview";
import {
  deferDueToLoadView,
  type PlayerLoadSnapshot,
} from "@/lib/arena/build-external-follow-up-recommendation";

const MS_PER_DAY = 86_400_000;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const OVERVIEW_FORBIDDEN = [
  "заметная нагрузка",
  "существенная нагрузка",
  "не наращивать нагрузку",
  "Нагрузка по расписанию команды сейчас существенная",
  "Текущая нагрузка",
  "Недавно была активность",
  "Основная нагрузка по смыслу",
  "Основная нагрузка остаётся",
  "По расписанию команды нагрузка заметная",
] as const;

const DEFER_FORBIDDEN = [
  "не увеличивать нагрузку",
  "заметная текущая нагрузка",
  "у игрока уже есть",
  "не наращивать объём",
  "пауза уместна",
] as const;

function assertNoForbidden(blob: string, forbidden: readonly string[], label: string) {
  const lower = blob.toLowerCase();
  for (const phrase of forbidden) {
    assert(
      !lower.includes(phrase.toLowerCase()),
      `${label}: forbidden regression phrase "${phrase}" in:\n${blob.slice(0, 600)}`
    );
  }
}

function assertOverviewShape(o: ReturnType<typeof composePlayerDevelopmentOverviewForRegressionGuard>) {
  assert(typeof o.phase === "string", "phase");
  assert(typeof o.phaseLabel === "string" && o.phaseLabel.length > 0, "phaseLabel");
  assert(typeof o.summary === "string", "summary");
  assert(Array.isArray(o.signals), "signals array");
  assert(Array.isArray(o.explanationPoints), "explanationPoints array");
  for (const s of o.signals) assert(typeof s === "string", "signal string");
  for (const s of o.explanationPoints) assert(typeof s === "string", "explanation string");
  assert(o.signals.length <= 3, "signals max 3");
  assert(o.explanationPoints.length <= 3, "explanationPoints max 3");
}

function assertDeferShape(v: ReturnType<typeof deferDueToLoadView>) {
  assert(v.type === "defer_due_to_load", "defer type");
  assert(typeof v.title === "string" && v.title.length > 0, "title");
  assert(typeof v.summary === "string" && v.summary.length > 0, "summary");
  assert(v.actionLabel === null && v.deferLabel === null, "labels null");
  assert(typeof v.sourceNote === "string" && v.sourceNote.length > 0, "sourceNote");
  assert(Array.isArray(v.explanationPoints) && v.explanationPoints.length > 0, "explanationPoints");
  assert(v.explanationPoints.length <= 3, "explanationPoints max 3");
}

function overviewBlob(
  o: ReturnType<typeof composePlayerDevelopmentOverviewForRegressionGuard>
): string {
  return [o.summary, o.phaseLabel, ...o.signals, ...o.explanationPoints].join("\n");
}

function deferBlob(v: ReturnType<typeof deferDueToLoadView>): string {
  return [v.title, v.summary, v.sourceNote, ...v.explanationPoints].join("\n");
}

function run() {
  const nowMs = Date.UTC(2026, 3, 12, 12, 0, 0);

  // --- build-player-development-overview (compose) ---
  const passiveWeekly3 = composePlayerDevelopmentOverviewForRegressionGuard({
    phase: "passive",
    load: { weeklySessions: 3, isHighLoad: false },
    hasRequest: false,
    latestReport: null,
    nowMs,
  });
  assertOverviewShape(passiveWeekly3);
  assertNoForbidden(overviewBlob(passiveWeekly3), OVERVIEW_FORBIDDEN, "passive weekly>=3");
  assert(
    passiveWeekly3.signals.some((s) => s.includes("ориентир по тренировочному графику")),
    "passive weekly>=3: expected calendar-orientation wording"
  );

  const passiveHighLoad = composePlayerDevelopmentOverviewForRegressionGuard({
    phase: "passive",
    load: { weeklySessions: 1, isHighLoad: true },
    hasRequest: false,
    latestReport: null,
    nowMs,
  });
  assertOverviewShape(passiveHighLoad);
  assertNoForbidden(overviewBlob(passiveHighLoad), OVERVIEW_FORBIDDEN, "passive high load");
  assert(
    passiveHighLoad.signals.some((s) => s.includes("тренировочному контексту")),
    "passive isHighLoad: expected context wording"
  );

  const activeWeekly1 = composePlayerDevelopmentOverviewForRegressionGuard({
    phase: "active_focus",
    load: { weeklySessions: 1, isHighLoad: false },
    hasRequest: false,
    latestReport: null,
    nowMs,
  });
  assertOverviewShape(activeWeekly1);
  assertNoForbidden(overviewBlob(activeWeekly1), OVERVIEW_FORBIDDEN, "active_focus weekly>=1");
  assert(
    activeWeekly1.signals.some((s) => s.includes("По расписанию команды и последним данным")),
    "active_focus movement signal"
  );

  const activeHighLoad = composePlayerDevelopmentOverviewForRegressionGuard({
    phase: "active_focus",
    load: { weeklySessions: 0, isHighLoad: true },
    hasRequest: true,
    latestReport: null,
    nowMs,
  });
  assertOverviewShape(activeHighLoad);
  assertNoForbidden(overviewBlob(activeHighLoad), OVERVIEW_FORBIDDEN, "active_focus high load");
  assert(
    activeHighLoad.signals.some((s) => s.includes("плотный график")),
    "active_focus isHighLoad signal"
  );

  const consolidationHigh = composePlayerDevelopmentOverviewForRegressionGuard({
    phase: "consolidation",
    load: { weeklySessions: 4, isHighLoad: true },
    hasRequest: false,
    latestReport: { createdAt: new Date(nowMs - 8 * MS_PER_DAY) },
    nowMs,
  });
  assertOverviewShape(consolidationHigh);
  assertNoForbidden(overviewBlob(consolidationHigh), OVERVIEW_FORBIDDEN, "consolidation high load");
  assert(
    consolidationHigh.signals.some((s) => s.includes("плотный тренировочный ритм")),
    "consolidation defer-adjacent wording"
  );

  const activeRecentReport = composePlayerDevelopmentOverviewForRegressionGuard({
    phase: "active_focus",
    load: { weeklySessions: 0, isHighLoad: false },
    hasRequest: false,
    latestReport: { createdAt: new Date(nowMs - 2 * MS_PER_DAY) },
    nowMs,
  });
  assertOverviewShape(activeRecentReport);
  assertNoForbidden(overviewBlob(activeRecentReport), OVERVIEW_FORBIDDEN, "active_focus recent report");
  assert(
    activeRecentReport.signals.some((s) => s.includes("последним данным")),
    "active_focus reportRecent path"
  );

  // --- deferDueToLoadView ---
  const baseLoad = (partial: Partial<PlayerLoadSnapshot>): PlayerLoadSnapshot => ({
    weeklySessions: 0,
    recentExternalCount: 0,
    lastExternalAtDaysAgo: 999,
    externalReportsLast2Days: 0,
    isHighLoad: true,
    ...partial,
  });

  const d1 = deferDueToLoadView(
    baseLoad({ weeklySessions: 4, recentExternalCount: 0, externalReportsLast2Days: 0 })
  );
  assertDeferShape(d1);
  assertNoForbidden(deferBlob(d1), DEFER_FORBIDDEN, "defer weekly>=4 + fallback");
  assert(d1.explanationPoints.length === 3, "defer: expect 3 points with fallback");
  assert(
    d1.explanationPoints.some((p) => p.includes("тренировочных слотов")),
    "defer: calendar slot line"
  );
  assert(
    d1.explanationPoints.some((p) => p.includes("не форсировать дополнительный объём")),
    "defer: fallback line"
  );

  const d2 = deferDueToLoadView(
    baseLoad({ weeklySessions: 0, recentExternalCount: 2, externalReportsLast2Days: 0 })
  );
  assertDeferShape(d2);
  assertNoForbidden(deferBlob(d2), DEFER_FORBIDDEN, "defer recentExternal>=2");
  assert(d2.explanationPoints.some((p) => p.includes("внешних отчётов")), "defer external count line");

  const d3 = deferDueToLoadView(
    baseLoad({ weeklySessions: 1, recentExternalCount: 0, externalReportsLast2Days: 3 })
  );
  assertDeferShape(d3);
  assertNoForbidden(deferBlob(d3), DEFER_FORBIDDEN, "defer externalReportsLast2Days");
  assert(
    d3.explanationPoints.some((p) => p.includes("не сгущать допконтур")),
    "defer density line"
  );

  const d4 = deferDueToLoadView(
    baseLoad({ weeklySessions: 5, recentExternalCount: 2, externalReportsLast2Days: 2 })
  );
  assertDeferShape(d4);
  assertNoForbidden(deferBlob(d4), DEFER_FORBIDDEN, "defer saturated points");
  assert(d4.explanationPoints.length === 3, "defer full triplet without fallback filler");
  assert(
    d4.title.includes("форсировать") && d4.summary.includes("ориентир по режиму"),
    "defer title/summary trust anchors"
  );

  console.log("parent-facing-trust-wording-slice.selftest (server): ok");
}

run();
