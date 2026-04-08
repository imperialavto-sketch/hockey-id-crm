import {
  resolveArenaQuickActionExecution,
  hasArenaTrainingNavigationContext,
  reliableArenaSessionAnchor,
} from "@/lib/arenaActionExecutionMap";
import type { CoachMarkPlayerContext } from "@/services/chatService";

const pid = "player-1";

describe("resolveArenaQuickActionExecution", () => {
  it("last_training → deep-navigation when session anchor + training context", () => {
    const pc: CoachMarkPlayerContext = {
      id: pid,
      latestSessionEvaluation: { effort: 4 },
      latestSessionReport: { trainingId: "train-99", summary: "ok" },
    };
    const r = resolveArenaQuickActionExecution("insight_followup_last_training", {
      playerId: pid,
      playerContext: pc,
    });
    expect(r.kind).toBe("deep-navigation");
    if (r.kind === "deep-navigation") {
      expect(String(r.href)).toBe("/player/player-1");
    }
  });

  it("last_training → screen-navigation hub when no anchor but training context", () => {
    const pc: CoachMarkPlayerContext = {
      id: pid,
      latestSessionEvaluation: { effort: 3 },
    };
    const r = resolveArenaQuickActionExecution("analyze_last_training", {
      playerId: pid,
      playerContext: pc,
    });
    expect(r.kind).toBe("screen-navigation");
    if (r.kind === "screen-navigation") {
      expect(String(r.href)).toContain("coach-materials");
    }
  });

  it("last_training → deep via live trainingSessionId only", () => {
    const pc: CoachMarkPlayerContext = {
      id: pid,
      latestLiveTrainingSummary: {
        trainingSessionId: "live-sess-1",
        shortSummary: "Good",
      },
    };
    const r = resolveArenaQuickActionExecution("analyze_last_training", {
      playerId: pid,
      playerContext: pc,
    });
    expect(r.kind).toBe("deep-navigation");
  });

  it("falls back to prompt without playerId", () => {
    const r = resolveArenaQuickActionExecution("insight_followup_last_training", {
      playerId: null,
      playerContext: { id: pid, latestSessionEvaluation: { effort: 3 } },
    });
    expect(r).toEqual({ kind: "prompt" });
  });

  it("falls back to prompt when no training context", () => {
    const r = resolveArenaQuickActionExecution("analyze_last_training", {
      playerId: pid,
      playerContext: { id: pid },
    });
    expect(r).toEqual({ kind: "prompt" });
  });

  it("meaning_growth → deep-navigation ai-analysis when AI context", () => {
    const pc: CoachMarkPlayerContext = {
      id: pid,
      aiAnalysis: { summary: "Test", growthAreas: ["a"] },
    };
    const r = resolveArenaQuickActionExecution("insight_followup_meaning_growth", {
      playerId: pid,
      playerContext: pc,
    });
    expect(r.kind).toBe("deep-navigation");
    if (r.kind === "deep-navigation") {
      expect(String(r.href)).toContain("ai-analysis");
    }
  });

  it("meaning_growth → screen-navigation player when other signals only", () => {
    const pc: CoachMarkPlayerContext = {
      id: pid,
      evaluationSummary: { totalEvaluations: 2 },
    };
    const r = resolveArenaQuickActionExecution("insight_followup_meaning_growth", {
      playerId: pid,
      playerContext: pc,
    });
    expect(r.kind).toBe("screen-navigation");
    if (r.kind === "screen-navigation") {
      expect(String(r.href)).toBe("/player/player-1");
    }
  });

  it("coach_report_plain → deep when published trainingId + text", () => {
    const pc: CoachMarkPlayerContext = {
      id: pid,
      latestSessionReport: { trainingId: "t-1", summary: "Hello" },
    };
    const r = resolveArenaQuickActionExecution("coach_report_plain", {
      playerId: pid,
      playerContext: pc,
    });
    expect(r.kind).toBe("deep-navigation");
  });

  it("coach_report_plain → screen hub when text but no trainingId", () => {
    const pc: CoachMarkPlayerContext = {
      id: pid,
      latestSessionReport: { summary: "Hello" },
    };
    const r = resolveArenaQuickActionExecution("coach_report_plain", {
      playerId: pid,
      playerContext: pc,
    });
    expect(r.kind).toBe("screen-navigation");
    if (r.kind === "screen-navigation") {
      expect(String(r.href)).toContain("coach-materials");
    }
  });

  it("unknown analyticsKey stays prompt", () => {
    expect(
      resolveArenaQuickActionExecution("help_at_home", {
        playerId: pid,
        playerContext: { id: pid },
      })
    ).toEqual({ kind: "prompt" });
  });
});

describe("hasArenaTrainingNavigationContext", () => {
  it("is false for empty context", () => {
    expect(hasArenaTrainingNavigationContext({ id: pid })).toBe(false);
  });
});

describe("reliableArenaSessionAnchor", () => {
  it("prefers report trainingId over live", () => {
    expect(
      reliableArenaSessionAnchor({
        id: pid,
        latestSessionReport: { trainingId: "a", summary: "x" },
        latestLiveTrainingSummary: { trainingSessionId: "b", shortSummary: "y" },
      })
    ).toBe("a");
  });
});
