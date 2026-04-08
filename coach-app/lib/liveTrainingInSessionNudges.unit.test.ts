import {
  buildInSessionNudgeCandidates,
  createInSessionNudgeGateState,
  tryAcceptInSessionNudgeMutable,
  type InSessionNudgeCandidate,
  IN_SESSION_NUDGE_DEFAULTS,
  type InSessionNudgeEventInput,
} from "@/lib/liveTrainingInSessionNudges";

function ev(over: Partial<InSessionNudgeEventInput> = {}): InSessionNudgeEventInput {
  return {
    playerId: null,
    playerNameRaw: null,
    category: null,
    sentiment: null,
    ...over,
  };
}

describe("buildInSessionNudgeCandidates", () => {
  it("repeated player focus: same playerId 3+ times", () => {
    const list = [
      ev({ playerId: "p1", sentiment: "neutral" }),
      ev({ playerId: "p1", sentiment: "neutral" }),
      ev({ playerId: "p1", sentiment: "neutral" }),
    ];
    const c = buildInSessionNudgeCandidates(list, { p1: "Марк Сидоров" });
    const t = c.find((x) => x.type === "repeated_player_focus");
    expect(t).toBeDefined();
    expect(t!.lineRu).toContain("Марк");
  });

  it("repeated domain: arena category base 3+ times", () => {
    const list = [
      ev({ category: "arena:skating" }),
      ev({ category: "arena:skating|x" }),
      ev({ category: "arena:skating" }),
    ];
    const c = buildInSessionNudgeCandidates(list);
    expect(c.some((x) => x.type === "repeated_domain_focus")).toBe(true);
  });

  it("repeated team/session themes", () => {
    const team = [ev({ category: "arena:team" }), ev({ category: "arena:team|a" })];
    const teamCand = buildInSessionNudgeCandidates(team, undefined, "Барсы U12").find(
      (x) => x.type === "repeated_team_theme"
    );
    expect(teamCand).toBeDefined();
    expect(teamCand!.action?.ctaLabelRu).toBe("В план");
    expect(teamCand!.action?.payload.title).toContain("Барсы");
    const sess = [ev({ category: "arena:session" }), ev({ category: "arena:session|b" })];
    expect(
      buildInSessionNudgeCandidates(sess).some((x) => x.type === "repeated_session_theme")
    ).toBe(true);
  });

  it("needs attention: 3+ negative for same player", () => {
    const list = [
      ev({ playerId: "p2", sentiment: "negative", textSnippet: "слабо на коньках" }),
      ev({ playerId: "p2", sentiment: "negative" }),
      ev({ playerId: "p2", sentiment: "negative" }),
    ];
    const c = buildInSessionNudgeCandidates(list, { p2: "Иван Петров" });
    const t = c.find((x) => x.type === "needs_attention_player");
    expect(t).toBeDefined();
    expect(t!.ttsEligible).toBe(true);
    expect(t!.speakRu).toBeDefined();
    expect(t!.action?.ctaLabelRu).toBe("Создать задачу");
    expect(t!.action?.payload.playerId).toBe("p2");
    expect(t!.action?.payload.description).toContain("коньках");
  });

  it("positive streak: 2+ positive for same player", () => {
    const list = [
      ev({ playerId: "p3", sentiment: "positive" }),
      ev({ playerId: "p3", sentiment: "positive" }),
    ];
    const c = buildInSessionNudgeCandidates(list, { p3: "Анна" });
    expect(c.some((x) => x.type === "positive_player_streak")).toBe(true);
  });

  it("empty / not enough data: no candidates", () => {
    expect(buildInSessionNudgeCandidates([])).toEqual([]);
    expect(buildInSessionNudgeCandidates([ev({ playerId: "x" }), ev({ playerId: "x" })])).toEqual([]);
  });

  it("needs_attention sorts before repeated_player for same player", () => {
    const list: InSessionNudgeEventInput[] = [];
    for (let i = 0; i < 3; i += 1) {
      list.push(ev({ playerId: "p1", sentiment: "negative" }));
    }
    const c = buildInSessionNudgeCandidates(list);
    expect(c[0]?.type).toBe("needs_attention_player");
  });
});

describe("tryAcceptInSessionNudgeMutable", () => {
  const cand = (over: Partial<InSessionNudgeCandidate> = {}): InSessionNudgeCandidate => ({
    type: "repeated_team_theme",
    dedupeKey: "k1",
    priority: 50,
    lineRu: "x",
    ttsEligible: false,
    ...over,
  });

  it("respects cooldown between any nudges", () => {
    const s = createInSessionNudgeGateState();
    const now = 1_000_000;
    expect(tryAcceptInSessionNudgeMutable(now, s, cand({ dedupeKey: "a" }))).toBe(true);
    expect(
      tryAcceptInSessionNudgeMutable(
        now + IN_SESSION_NUDGE_DEFAULTS.cooldownMs - 1,
        s,
        cand({ dedupeKey: "b" })
      )
    ).toBe(false);
    expect(
      tryAcceptInSessionNudgeMutable(
        now + IN_SESSION_NUDGE_DEFAULTS.cooldownMs,
        s,
        cand({ dedupeKey: "b" })
      )
    ).toBe(true);
  });

  it("respects same-key cooldown", () => {
    const s = createInSessionNudgeGateState();
    const t0 = 2_000_000;
    expect(tryAcceptInSessionNudgeMutable(t0, s, cand({ dedupeKey: "same" }))).toBe(true);
    s.lastEmitAt = 0;
    expect(
      tryAcceptInSessionNudgeMutable(
        t0 + IN_SESSION_NUDGE_DEFAULTS.sameKeyCooldownMs - 1,
        s,
        cand({ dedupeKey: "same" })
      )
    ).toBe(false);
  });

  it("caps total nudges per session", () => {
    const s = createInSessionNudgeGateState();
    let tick = 0;
    for (let i = 0; i < IN_SESSION_NUDGE_DEFAULTS.maxPerSession; i += 1) {
      tick += IN_SESSION_NUDGE_DEFAULTS.cooldownMs;
      expect(tryAcceptInSessionNudgeMutable(tick, s, cand({ dedupeKey: `u${i}` }))).toBe(true);
    }
    tick += IN_SESSION_NUDGE_DEFAULTS.cooldownMs;
    expect(tryAcceptInSessionNudgeMutable(tick, s, cand({ dedupeKey: "extra" }))).toBe(false);
  });
});
