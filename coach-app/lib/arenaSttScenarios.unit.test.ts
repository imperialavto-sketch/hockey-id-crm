import { createEmptyArenaConversationContext } from "@/lib/arenaConversationContext";
import {
  parseArenaCommand,
  stripWakeWordFromTranscript,
  transcriptContainsWakeWord,
} from "@/lib/arenaVoiceIntentParser";
import { resolveArenaClarificationFollowUp } from "@/lib/arenaClarificationResolver";
import type { ArenaPendingClarificationActive } from "@/lib/arenaPendingClarification";

describe("Arena STT-like Russian scenarios", () => {
  const ctx = createEmptyArenaConversationContext();
  const roster = [
    { id: "p1", name: "Марк Сидоров" },
    { id: "p2", name: "Иван Иванов", lastName: "Иванов" },
  ];

  it.each([
    ["Арена Марк плохо держит посадку", "create_player_observation"],
    ["арена марк плохо держит посадку", "create_player_observation"],
    ["Арена, пятерка плохо выходит из зоны", "create_team_observation"],
    ["Арена сегодня темп низкий", "create_session_observation"],
    ["Удали последнее", "delete_last_observation"],
  ])("%s → %s", (phrase, kind) => {
    const r = parseArenaCommand(phrase, kind.includes("player") ? roster : [], ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.intent.kind).toBe(kind);
  });

  it("continuation: И еще поздно возвращается (с lastReferencedPlayer)", () => {
    const ctx2 = createEmptyArenaConversationContext();
    ctx2.lastReferencedPlayer = { id: "p1", name: "Марк Сидоров" };
    const r = parseArenaCommand("И еще поздно возвращается", roster, ctx2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.intent.kind).toBe("create_player_observation");
    if (r.intent.kind === "create_player_observation") expect(r.intent.playerId).toBe("p1");
  });

  it("reassign: Это было про Иванова", () => {
    const r = parseArenaCommand("Это было про Иванова", roster, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.intent.kind).toBe("reassign_last_observation");
  });

  it("wake without comma: Арена Марк …", () => {
    expect(transcriptContainsWakeWord("Арена Марк плохо держит посадку")).toBe(true);
    const stripped = stripWakeWordFromTranscript("Арена Марк плохо держит посадку");
    expect(stripped).toContain("марк");
    expect(stripped).not.toContain("арена");
  });

  it("clarification follow-up: не, про марка (player)", () => {
    const pending: ArenaPendingClarificationActive = {
      kind: "awaiting_followup",
      sessionId: "s1",
      clarificationType: "player",
      prompt: "Уточни игрока",
      pendingObservation: {
        rawForStorage: "плохо держит посадку",
        workNormalized: "плохо держит посадку",
        sentiment: "negative",
        domain: "skating",
        skill: "posture",
        ontoConfidence: 0.88,
        continuation: false,
      },
      candidates: roster,
      retryCount: 0,
      createdAt: Date.now(),
    };
    const res = resolveArenaClarificationFollowUp({
      followUpRaw: "не, про марка",
      pending,
      roster,
      conversationCtx: ctx,
    });
    expect(res.kind).toBe("resolved");
    if (res.kind === "resolved" && res.intent.kind === "create_player_observation") {
      expect(res.intent.playerId).toBe("p1");
    }
  });

  it("clarification follow-up: Нет про Марка (player)", () => {
    const pending: ArenaPendingClarificationActive = {
      kind: "awaiting_followup",
      sessionId: "s1",
      clarificationType: "player",
      prompt: "Уточни игрока",
      pendingObservation: {
        rawForStorage: "плохо держит посадку",
        workNormalized: "плохо держит посадку",
        sentiment: "negative",
        domain: "skating",
        skill: "posture",
        ontoConfidence: 0.88,
        continuation: false,
      },
      candidates: roster,
      retryCount: 0,
      createdAt: Date.now(),
    };
    const res = resolveArenaClarificationFollowUp({
      followUpRaw: "Нет про Марка",
      pending,
      roster,
      conversationCtx: ctx,
    });
    expect(res.kind).toBe("resolved");
    if (res.kind === "resolved") {
      expect(res.intent.kind).toBe("create_player_observation");
      if (res.intent.kind === "create_player_observation") expect(res.intent.playerId).toBe("p1");
    }
  });

  it("clarification follow-up: Про пятерку (target → team)", () => {
    const pending: ArenaPendingClarificationActive = {
      kind: "awaiting_followup",
      sessionId: "s1",
      clarificationType: "target",
      prompt: "Про игрока или пятёрку?",
      pendingObservation: {
        rawForStorage: "плохо выходит из зоны",
        workNormalized: "плохо выходит из зоны",
        sentiment: "negative",
        domain: "passing",
        skill: "first_pass",
        ontoConfidence: 0.86,
        continuation: false,
      },
      retryCount: 0,
      createdAt: Date.now(),
    };
    const res = resolveArenaClarificationFollowUp({
      followUpRaw: "Про пятерку",
      pending,
      roster,
      conversationCtx: ctx,
    });
    expect(res.kind).toBe("resolved");
    if (res.kind === "resolved") expect(res.intent.kind).toBe("create_team_observation");
  });

  it("clarification follow-up: Защитник (role disambiguation)", () => {
    const defenders = [
      { id: "d1", name: "Петр Смирнов", position: "Защитник" },
      { id: "f1", name: "Марк Сидоров", position: "Нападающий" },
    ];
    const pending: ArenaPendingClarificationActive = {
      kind: "awaiting_followup",
      sessionId: "s1",
      clarificationType: "player",
      prompt: "Несколько подходят",
      pendingObservation: {
        rawForStorage: "тест",
        workNormalized: "тест",
        sentiment: "neutral",
        domain: null,
        skill: null,
        ontoConfidence: 0.2,
        continuation: false,
      },
      candidates: defenders,
      retryCount: 0,
      createdAt: Date.now(),
    };
    const res = resolveArenaClarificationFollowUp({
      followUpRaw: "Защитник",
      pending,
      roster: defenders,
      conversationCtx: ctx,
    });
    expect(res.kind).toBe("resolved");
    if (res.kind === "resolved" && res.intent.kind === "create_player_observation") {
      expect(res.intent.playerId).toBe("d1");
    }
  });
});
