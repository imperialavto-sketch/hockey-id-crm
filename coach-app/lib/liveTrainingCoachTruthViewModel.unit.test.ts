import { buildLiveTrainingCoachTruthSummary } from "@/lib/liveTrainingCoachTruthViewModel";
import type { LiveTrainingSessionOutcome } from "@/types/liveTraining";
import type { LiveTrainingActionCandidate } from "@/services/liveTrainingService";

const baseOutcome = (): LiveTrainingSessionOutcome => ({
  includedDraftsCount: 6,
  excludedDraftsCount: 1,
  draftsFlaggedNeedsReview: 1,
  manualAttentionDraftsCount: 2,
  playerObservationCount: 3,
  playerLinkedObservationCount: 2,
  playerObservationUnlinkedCount: 1,
  teamObservationCount: 2,
  sessionObservationCount: 1,
  signalsCreatedCount: 4,
  affectedPlayersCount: 2,
  positiveSignalsCount: 2,
  negativeSignalsCount: 2,
  neutralSignalsCount: 0,
  topDomains: ["skating"],
  topPlayers: [],
});

describe("buildLiveTrainingCoachTruthSummary", () => {
  it("aggregates outcome and manual attention (needsReview + unlinked)", () => {
    const t = buildLiveTrainingCoachTruthSummary({ outcome: baseOutcome() });
    expect(t.playerSignalsCreated).toBe(4);
    expect(t.teamObservationsIncluded).toBe(2);
    expect(t.sessionObservationsIncluded).toBe(1);
    expect(t.needsManualAttentionCount).toBe(2);
    expect(t.excludedObservationsCount).toBe(1);
    expect(t.coachHints.length).toBeGreaterThan(0);
  });

  it("counts materialized vs pending action candidates", () => {
    const candidates: LiveTrainingActionCandidate[] = [
      {
        id: "a",
        playerId: "p",
        playerName: "X",
        source: "live_training",
        actionType: "x",
        title: "T",
        body: "B",
        tone: "neutral",
        priority: "low",
        basedOn: { signalCount: 1, domains: [], lastSessionAt: null },
        isMaterialized: true,
      },
      {
        id: "b",
        playerId: "p",
        playerName: "X",
        source: "live_training",
        actionType: "x",
        title: "T2",
        body: "B2",
        tone: "neutral",
        priority: "low",
        basedOn: { signalCount: 1, domains: [], lastSessionAt: null },
      },
    ];
    const t = buildLiveTrainingCoachTruthSummary({
      outcome: baseOutcome(),
      actionCandidates: candidates,
    });
    expect(t.materializedActionCount).toBe(1);
    expect(t.pendingActionCount).toBe(1);
    expect(t.totalActionCandidates).toBe(2);
  });

  it("player-only observations: no team/session lines zero", () => {
    const o = baseOutcome();
    o.teamObservationCount = 0;
    o.sessionObservationCount = 0;
    const t = buildLiveTrainingCoachTruthSummary({ outcome: o });
    expect(t.teamObservationsIncluded).toBe(0);
    expect(t.sessionObservationsIncluded).toBe(0);
  });
});
