import {
  appendCapturedSessionAction,
  buildInSessionActionMemoryView,
  clipMemoryTitle,
  type LiveTrainingInSessionCapturedAction,
} from "@/lib/liveTrainingInSessionActionMemory";

function row(
  dedupeKey: string,
  createdAt: string,
  over: Partial<LiveTrainingInSessionCapturedAction> = {}
): LiveTrainingInSessionCapturedAction {
  return {
    kind: "player",
    title: "T",
    dedupeKey,
    createdAt,
    ...over,
  };
}

describe("appendCapturedSessionAction", () => {
  it("appends and skips duplicate dedupeKey", () => {
    const a = appendCapturedSessionAction([], {
      kind: "player",
      title: "A",
      dedupeKey: "k1",
    });
    expect(a).toHaveLength(1);
    const b = appendCapturedSessionAction(a, {
      kind: "team",
      title: "B",
      dedupeKey: "k1",
    });
    expect(b).toHaveLength(1);
    const c = appendCapturedSessionAction(a, {
      kind: "team",
      title: "C",
      dedupeKey: "k2",
    });
    expect(c).toHaveLength(2);
  });
});

describe("buildInSessionActionMemoryView", () => {
  it("shows newest first and moreCount", () => {
    const items = [
      row("a", "2026-01-01T10:00:00.000Z", { title: "old" }),
      row("b", "2026-01-01T12:00:00.000Z", { title: "new" }),
      row("c", "2026-01-01T11:00:00.000Z", { title: "mid" }),
    ];
    const v = buildInSessionActionMemoryView(items, 2);
    expect(v.preview.map((x) => x.title)).toEqual(["new", "mid"]);
    expect(v.moreCount).toBe(1);
  });

  it("empty", () => {
    expect(buildInSessionActionMemoryView([])).toEqual({ preview: [], moreCount: 0 });
  });
});

describe("clipMemoryTitle", () => {
  it("truncates long titles", () => {
    const s = "a".repeat(60);
    expect(clipMemoryTitle(s, 10).length).toBeLessThanOrEqual(10);
    expect(clipMemoryTitle("short")).toBe("short");
  });
});
