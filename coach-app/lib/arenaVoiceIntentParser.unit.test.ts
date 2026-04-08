import { createEmptyArenaConversationContext } from "@/lib/arenaConversationContext";
import {
  parseArenaCommand,
  stripWakeWordFromTranscript,
  transcriptContainsWakeWord,
} from "@/lib/arenaVoiceIntentParser";

describe("arenaVoiceIntentParser (Cyrillic-safe wake / targets)", () => {
  const ctx = createEmptyArenaConversationContext();
  const roster = [{ id: "p1", name: "Марк Сидоров" }];

  it("strips wake word after comma (JS \\b does not work for Cyrillic)", () => {
    const s = stripWakeWordFromTranscript("Арена, Марк плохо держит посадку");
    expect(s).toContain("марк");
    expect(s).not.toContain("арена");
  });

  it("detects wake word in typical STT phrase", () => {
    expect(transcriptContainsWakeWord("скажи арена марк плохо")).toBe(true);
  });

  it("parses player observation with skating.posture and negative sentiment", () => {
    const r = parseArenaCommand("Арена, Марк плохо держит посадку", roster, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.intent.kind).toBe("create_player_observation");
    if (r.intent.kind !== "create_player_observation") return;
    expect(r.intent.category).toBe("skating.posture");
    expect(r.intent.sentiment).toBe("negative");
    expect(r.intent.playerId).toBe("p1");
  });

  it("parses session observation (сегодня / темп) → arena:session (+ optional ontology tag)", () => {
    const r = parseArenaCommand("арена сегодня темп низкий", [], ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.intent.kind).toBe("create_session_observation");
    if (r.intent.kind !== "create_session_observation") return;
    expect(r.intent.category.startsWith("arena:session")).toBe(true);
    expect(r.intent.needsReview).toBe(true);
  });

  it("parses team observation for «пятёрка … выходит из зоны»", () => {
    const r = parseArenaCommand("арена пятёрка плохо выходит из зоны", [], ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.intent.kind).toBe("create_team_observation");
    if (r.intent.kind !== "create_team_observation") return;
    expect(r.intent.category.startsWith("arena:team")).toBe(true);
  });

  it("parses finish_session", () => {
    const r = parseArenaCommand("арена закончить тренировку", roster, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.intent.kind).toBe("finish_session");
  });

  it("parses delete_last_observation", () => {
    const r = parseArenaCommand("арена удали последнее", roster, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.intent.kind).toBe("delete_last_observation");
  });
});
