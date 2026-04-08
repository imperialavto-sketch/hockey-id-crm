import { buildLiveTrainingCoachPostSessionSummary } from "@/lib/liveTrainingCoachSummaryViewModel";
import type { LiveTrainingSessionOutcome } from "@/types/liveTraining";

const baseOutcome = (): LiveTrainingSessionOutcome => ({
  includedDraftsCount: 4,
  excludedDraftsCount: 0,
  draftsFlaggedNeedsReview: 1,
  manualAttentionDraftsCount: 1,
  playerObservationCount: 3,
  playerLinkedObservationCount: 3,
  playerObservationUnlinkedCount: 0,
  teamObservationCount: 1,
  sessionObservationCount: 0,
  signalsCreatedCount: 3,
  affectedPlayersCount: 2,
  positiveSignalsCount: 2,
  negativeSignalsCount: 1,
  neutralSignalsCount: 0,
  topDomains: ["skating", "passing"],
  topPlayers: [
    {
      playerId: "p1",
      playerName: "Марк Сидоров",
      totalSignals: 2,
      positiveCount: 0,
      negativeCount: 2,
      neutralCount: 0,
      topDomains: ["skating"],
    },
    {
      playerId: "p2",
      playerName: "Иван Иванов",
      totalSignals: 1,
      positiveCount: 1,
      negativeCount: 0,
      neutralCount: 0,
      topDomains: ["passing"],
    },
  ],
});

describe("buildLiveTrainingCoachPostSessionSummary", () => {
  it("flags players needing attention and positive players", () => {
    const s = buildLiveTrainingCoachPostSessionSummary({ outcome: baseOutcome() });
    expect(s.playersNeedingAttention.some((p) => p.playerId === "p1")).toBe(true);
    expect(s.playersPositive.some((p) => p.playerId === "p2")).toBe(true);
    expect(s.playerObservationCount).toBe(3);
    expect(s.teamObservationCount).toBe(1);
  });

  it("uses continuity carried players and domains", () => {
    const s = buildLiveTrainingCoachPostSessionSummary({
      outcome: baseOutcome(),
      continuitySnapshot: {
        version: 1,
        generatedAt: "x",
        teamId: "t1",
        carriedFocusPlayers: [{ playerId: "p1", playerName: "Марк Сидоров", reason: "Посадка" }],
        carriedDomains: [{ domain: "skating", labelRu: "Катание", reason: "Повтор", source: "x" }],
        carriedReinforceAreas: [],
        summaryLines: [],
      },
    });
    expect(s.carryForwardFocus.length).toBeGreaterThan(0);
    expect(s.suggestedActions.some((a) => a.kind === "next_session_carry")).toBe(true);
  });
});
