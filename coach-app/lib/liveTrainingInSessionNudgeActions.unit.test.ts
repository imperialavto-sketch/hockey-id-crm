import {
  buildNeedsAttentionActionPayload,
  buildTeamFocusActionPayload,
} from "@/lib/liveTrainingInSessionNudgeActions";

describe("buildNeedsAttentionActionPayload", () => {
  it("includes playerId and snippets", () => {
    const p = buildNeedsAttentionActionPayload({
      playerLabel: "Марк",
      playerId: "pid1",
      negativeCount: 3,
      snippets: ["один", "два", "три", "четыре"],
    });
    expect(p.playerId).toBe("pid1");
    expect(p.title).toContain("Марк");
    expect(p.description).toContain("один");
    expect(p.description).toContain("Негативных наблюдений: 3");
  });

  it("omits playerId when absent", () => {
    const p = buildNeedsAttentionActionPayload({
      playerLabel: "Игрок",
      negativeCount: 3,
      snippets: [],
    });
    expect(p.playerId).toBeUndefined();
  });
});

describe("buildTeamFocusActionPayload", () => {
  it("adds team name to title when provided", () => {
    const p = buildTeamFocusActionPayload("Команда А");
    expect(p.title).toContain("Команда А");
    expect(p.playerId).toBeUndefined();
  });
});
