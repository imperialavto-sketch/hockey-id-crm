import {
  buildLiveTrainingStartClosedLoopPrep,
  liveTrainingStartClosedLoopPrepHasContent,
} from "@/lib/liveTrainingStartCarryForwardViewModel";
import type { LiveTrainingStartPlanningSummary } from "@/services/liveTrainingService";

function basePlanning(
  over: Partial<LiveTrainingStartPlanningSummary> = {}
): LiveTrainingStartPlanningSummary {
  return {
    teamId: "t1",
    focusPlayers: [],
    focusDomains: [],
    reinforceAreas: [],
    summaryLines: [],
    lowData: true,
    planSeeds: { blocks: [], lowData: true },
    startPriorities: {
      primaryPlayers: [],
      primaryDomains: [],
      secondaryItems: [],
      reinforcementItems: [],
      lowData: true,
    },
    ...over,
  };
}

describe("buildLiveTrainingStartClosedLoopPrep", () => {
  it("carried players/domains: prefers startPriorities primary", () => {
    const p = basePlanning({
      startPriorities: {
        summaryLine: "Главный акцент старта",
        primaryPlayers: [
          {
            playerId: "p1",
            playerName: "Марк Сидоров",
            reason: "Lock-in",
            source: "continuity_lock_in",
          },
        ],
        primaryDomains: [{ domain: "skating", labelRu: "Катание", reason: "Часто", source: "continuity_lock_in" }],
        secondaryItems: [],
        reinforcementItems: [],
        lowData: false,
      },
      carryForward: {
        teamId: "t1",
        carryForwardSummary: ["Строка переноса"],
        focusPlayers: [],
        focusDomains: [],
        reinforceAreas: [],
        lowData: false,
      },
    });
    const h = buildLiveTrainingStartClosedLoopPrep(p);
    expect(h.playersInFocus[0]?.playerId).toBe("p1");
    expect(h.themesForToday).toContain("Катание");
    expect(h.fromLastSession.some((l) => l.includes("Главный"))).toBe(true);
  });

  it("team/session hints go to teamGroupAccent", () => {
    const p = basePlanning({
      lastSessionHandoffHints: [
        "Пятёрка: в прошлой фиксации 2 наблюдений — сохрани групповой акцент.",
        "Итог сессии: 1 записей с прошлого занятия.",
      ],
    });
    const h = buildLiveTrainingStartClosedLoopPrep(p);
    expect(h.teamGroupAccent.length).toBe(2);
  });

  it("manual attention hint in unresolved", () => {
    const p = basePlanning({
      lastSessionHandoffHints: ["Не закрыто вручную с прошлого старта: 2 позиции."],
    });
    const h = buildLiveTrainingStartClosedLoopPrep(p);
    expect(h.unresolvedOrDeferred.some((l) => l.includes("Не закрыто"))).toBe(true);
  });

  it("empty planning has no content", () => {
    const h = buildLiveTrainingStartClosedLoopPrep(null);
    expect(liveTrainingStartClosedLoopPrepHasContent(h)).toBe(false);
  });

  it("recover execution adds deferred line", () => {
    const p = basePlanning({
      priorAlignmentAdaptive: { executionMode: "recover" },
    });
    const h = buildLiveTrainingStartClosedLoopPrep(p);
    expect(h.unresolvedOrDeferred.some((l) => l.includes("неполно"))).toBe(true);
  });
});
