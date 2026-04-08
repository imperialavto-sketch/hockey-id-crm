import { normalizeArenaTranscript, normalizeForWakeMatch } from "@/lib/arenaTranscriptNormalizer";

describe("arenaTranscriptNormalizer", () => {
  it("collapses spaces, ё→е, trims edge punctuation", () => {
    expect(normalizeArenaTranscript("  Ёлка  ")).toBe("елка");
    expect(normalizeArenaTranscript("…арена, марк…")).toContain("арена");
  });

  it("fixes аренна → арена", () => {
    expect(normalizeArenaTranscript("аренна марк")).toBe("арена марк");
  });

  it("fixes split wake арен а", () => {
    expect(normalizeForWakeMatch("арен а марк")).toContain("арена");
  });

  it("splits glued аренамарк", () => {
    expect(normalizeArenaTranscript("аренамарк плохо")).toContain("арена марк");
  });
});
