import {
  buildLiveTrainingNextTrainingHandoff,
  liveTrainingNextHandoffHasContent,
} from "@/lib/liveTrainingNextTrainingHandoffViewModel";
import type { LiveTrainingSessionOutcome } from "@/types/liveTraining";
import type { LiveTrainingActionCandidate } from "@/services/liveTrainingService";

function baseOutcome(over: Partial<LiveTrainingSessionOutcome> = {}): LiveTrainingSessionOutcome {
  return {
    includedDraftsCount: 5,
    excludedDraftsCount: 0,
    draftsFlaggedNeedsReview: 0,
    manualAttentionDraftsCount: 0,
    playerObservationCount: 4,
    playerLinkedObservationCount: 4,
    playerObservationUnlinkedCount: 0,
    teamObservationCount: 0,
    sessionObservationCount: 0,
    signalsCreatedCount: 4,
    affectedPlayersCount: 2,
    positiveSignalsCount: 2,
    negativeSignalsCount: 2,
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
        totalSignals: 2,
        positiveCount: 2,
        negativeCount: 0,
        neutralCount: 0,
        topDomains: ["passing"],
      },
    ],
    ...over,
  };
}

describe("buildLiveTrainingNextTrainingHandoff", () => {
  it("player-heavy: team/session lines explain no group records", () => {
    const h = buildLiveTrainingNextTrainingHandoff({ outcome: baseOutcome() });
    expect(h.teamAndSessionFocus.some((l) => l.includes("не было"))).toBe(true);
    expect(h.playersForIndividualAccent.some((p) => p.playerId === "p1")).toBe(true);
    expect(h.playerThematicFocus.length).toBeGreaterThan(0);
  });

  it("team/session-heavy: group lines and optional team immediate action", () => {
    const h = buildLiveTrainingNextTrainingHandoff({
      outcome: baseOutcome({
        teamObservationCount: 2,
        sessionObservationCount: 1,
        playerObservationCount: 0,
        topPlayers: [],
        topDomains: [],
      }),
    });
    expect(h.teamAndSessionFocus.some((l) => l.includes("Пятёрка"))).toBe(true);
    expect(h.teamAndSessionFocus.some((l) => l.includes("Сессия"))).toBe(true);
    expect(h.suggestedImmediateActions.some((a) => a.scope === "team")).toBe(true);
  });

  it("carry-forward: uses continuity summary and carried players", () => {
    const h = buildLiveTrainingNextTrainingHandoff({
      outcome: baseOutcome({ topPlayers: [] }),
      continuitySnapshot: {
        version: 1,
        generatedAt: "t",
        teamId: "tm",
        carriedFocusPlayers: [{ playerId: "p9", playerName: "Пётр П.", reason: "Контроль коньков" }],
        carriedDomains: [{ domain: "skating", labelRu: "Катание", reason: "Повтор", source: "x" }],
        carriedReinforceAreas: [],
        summaryLines: ["Следующий старт: короткий темп"],
      },
    });
    expect(h.nextTrainingFocus.some((l) => l.includes("Следующий старт"))).toBe(true);
    expect(h.playersForIndividualAccent.some((p) => p.playerId === "p9")).toBe(true);
  });

  it("action candidates: surfaces pending player-scoped actions", () => {
    const candidates: LiveTrainingActionCandidate[] = [
      {
        id: "c1",
        playerId: "p1",
        playerName: "Марк Сидоров",
        source: "live_training",
        actionType: "t",
        title: "Добавить работу по коньку",
        body: "Короткий шаг",
        tone: "attention",
        priority: "high",
        basedOn: { signalCount: 2, domains: ["skating"], lastSessionAt: null },
      },
    ];
    const h = buildLiveTrainingNextTrainingHandoff({
      outcome: baseOutcome(),
      actionCandidates: candidates,
    });
    expect(h.suggestedImmediateActions.length).toBeGreaterThan(0);
    expect(h.suggestedImmediateActions[0].scope).toBe("player");
    expect(h.suggestedImmediateActions[0].title).toContain("коньку");
  });

  it("manual attention: deferred line from truth", () => {
    const h = buildLiveTrainingNextTrainingHandoff({
      outcome: baseOutcome({
        manualAttentionDraftsCount: 2,
        draftsFlaggedNeedsReview: 2,
      }),
    });
    expect(h.deferredOrReviewItems.some((l) => l.includes("ручную проверку"))).toBe(true);
  });

  it("liveTrainingNextHandoffHasContent is false for empty session", () => {
    const h = buildLiveTrainingNextTrainingHandoff({
      outcome: baseOutcome({
        includedDraftsCount: 0,
        playerObservationCount: 0,
        teamObservationCount: 0,
        sessionObservationCount: 0,
        signalsCreatedCount: 0,
        affectedPlayersCount: 0,
        topDomains: [],
        topPlayers: [],
      }),
    });
    expect(liveTrainingNextHandoffHasContent(h)).toBe(false);
  });
});
