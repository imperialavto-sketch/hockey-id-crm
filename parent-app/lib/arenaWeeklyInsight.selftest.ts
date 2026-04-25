/**
 * Run from repo root:
 *   cd parent-app && npx tsx lib/arenaWeeklyInsight.selftest.ts
 *
 * Regression guard for closed parent-facing trust wording slice (weekly insight).
 */

import {
  deriveArenaInsightFollowUps,
  deriveArenaWeeklyInsight,
} from "@/lib/arenaWeeklyInsight";
import type { ArenaParentPlayerContext } from "@/types/arenaParentPlayerContext";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const INSIGHT_FORBIDDEN = [
  "Сигнал тренера",
  "Сигналы с последней live-сессии",
  "Линия развития из недавних сигналов",
  "картина сложится",
  "фокус станет конкретнее",
  "текущие сигналы значат",
] as const;

function assertNoForbidden(blob: string, label: string) {
  for (const phrase of INSIGHT_FORBIDDEN) {
    assert(
      !blob.includes(phrase),
      `${label}: forbidden regression phrase "${phrase}" in:\n${blob.slice(0, 800)}`
    );
  }
}

function assertInsightShape(
  o: NonNullable<ReturnType<typeof deriveArenaWeeklyInsight>>,
  label: string
) {
  assert(typeof o.focus === "string" && o.focus.length > 0, `${label}: focus`);
  assert(typeof o.signal === "string" && o.signal.length > 0, `${label}: signal`);
  assert(typeof o.parentTip === "string" && o.parentTip.length > 0, `${label}: parentTip`);
  assert(typeof o.isLowData === "boolean", `${label}: isLowData`);
}

function run() {
  const evalCtx: ArenaParentPlayerContext = {
    id: "player-eval",
    latestSessionEvaluation: {
      effort: 4,
      focus: 3,
      discipline: 4,
      note: "Стабильная работа ногами на всей длине площадки",
    },
  };
  const evalOut = deriveArenaWeeklyInsight(evalCtx);
  assert(evalOut, "evaluation branch");
  assertInsightShape(evalOut, "evaluation");
  const evalBlob = `${evalOut.focus}\n${evalOut.signal}\n${evalOut.parentTip}`;
  assertNoForbidden(evalBlob, "evaluation");
  assert(evalOut.focus.startsWith("От тренера:"), "evaluation: coach note prefix");

  const liveCtx: ArenaParentPlayerContext = {
    id: "player-live",
    latestLiveTrainingSummary: {
      highlights: ["Короткий акцент с последней тренировки для сигнала в одну строку"],
    },
  };
  const liveOut = deriveArenaWeeklyInsight(liveCtx);
  assert(liveOut, "live branch");
  assertInsightShape(liveOut, "live");
  const liveBlob = `${liveOut.focus}\n${liveOut.signal}\n${liveOut.parentTip}`;
  assertNoForbidden(liveBlob, "live");
  assert(
    liveOut.focus === "По последним live-наблюдениям",
    "live: fallback focus when no developmentFocus"
  );

  const storyCtx: ArenaParentPlayerContext = {
    id: "player-story",
    playerStory: {
      trendItems: ["Недавний тренд по игре в средней зоне — держим спокойный темп"],
      lowData: false,
    },
  };
  const storyOut = deriveArenaWeeklyInsight(storyCtx);
  assert(storyOut, "story branch");
  assertInsightShape(storyOut, "story");
  assert(storyOut.isLowData === false, "story not lowData");
  const storyBlob = `${storyOut.focus}\n${storyOut.signal}\n${storyOut.parentTip}`;
  assertNoForbidden(storyBlob, "story");
  assert(
    storyOut.focus === "Ориентир по недавним наблюдениям в профиле",
    "story: non-low focus"
  );

  const storyLowCtx: ArenaParentPlayerContext = {
    id: "player-story-low",
    playerStory: {
      trendItems: ["Общий тренд пока без детализации — мало точек для узкого фокуса"],
      lowData: true,
    },
  };
  const storyLowOut = deriveArenaWeeklyInsight(storyLowCtx);
  assert(storyLowOut, "story low");
  assertInsightShape(storyLowOut, "storyLow");
  assert(storyLowOut.isLowData === true, "story lowData flag");
  const storyLowBlob = `${storyLowOut.focus}\n${storyLowOut.signal}\n${storyLowOut.parentTip}`;
  assertNoForbidden(storyLowBlob, "storyLow");
  assert(
    storyLowOut.parentTip.includes("обычно конкретизируется"),
    "story low: softened evolution copy"
  );

  const emptyCtx: ArenaParentPlayerContext = { id: "player-empty", name: "Илья" };
  const lowOut = deriveArenaWeeklyInsight(emptyCtx);
  assert(lowOut, "low data fallback");
  assertInsightShape(lowOut, "lowData");
  assert(lowOut.isLowData === true, "lowData flag");
  const lowBlob = `${lowOut.focus}\n${lowOut.signal}\n${lowOut.parentTip}`;
  assertNoForbidden(lowBlob, "lowData");
  assert(
    lowOut.signal.includes("опорных данных") && lowOut.signal.includes("обычно проясняется"),
    "lowData: honest sparse-data copy"
  );

  const followLow = deriveArenaInsightFollowUps(emptyCtx);
  assert(followLow.length === 2, "low-data follow-ups count");
  for (const a of followLow) {
    assert(typeof a.analyticsKey === "string", "followUp analyticsKey");
    assert(typeof a.label === "string", "followUp label");
    assert(typeof a.prompt === "string", "followUp prompt");
  }
  const followBlob = followLow.map((a) => a.prompt).join("\n");
  assertNoForbidden(followBlob, "followUp low-data");

  const trendCtx: ArenaParentPlayerContext = {
    id: "player-trend-follow",
    playerStory: { trendItems: ["тренд"], lowData: false },
  };
  const followTrend = deriveArenaInsightFollowUps(trendCtx);
  const meaning = followTrend.find((a) => a.analyticsKey === "insight_followup_meaning_growth");
  assert(meaning, "meaning_growth action present");
  assert(
    meaning.prompt.includes("может значить") && !meaning.prompt.includes("текущие сигналы значат"),
    "meaning_growth prompt trust wording"
  );
  assertNoForbidden(meaning.prompt, "meaning_growth prompt");

  console.log("arenaWeeklyInsight.selftest (parent-app): ok");
}

run();
