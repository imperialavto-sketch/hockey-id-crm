import {
  matchArenaQuickActionsInText,
  ARENA_CORE_FLOW_BUBBLE_CHIP_LABEL_ORDER,
} from "@/lib/arenaActionMatcher";

describe("matchArenaQuickActionsInText", () => {
  it("matches canonical label case-insensitively", () => {
    const t =
      "Кратко: ок.\nЧто делать дальше: разобрать тренировку с ребёнком спокойно.";
    const m = matchArenaQuickActionsInText(t, { max: 3 });
    expect(m.some((x) => x.label === "Разобрать тренировку")).toBe(true);
  });

  it("returns empty when no labels", () => {
    expect(matchArenaQuickActionsInText("Спасибо, понятно.")).toEqual([]);
  });

  it("excludes header labels", () => {
    const text = "Попробуйте: разобрать тренировку и как помочь дома.";
    const ex = new Set(["разобрать тренировку"]);
    const m = matchArenaQuickActionsInText(text, { excludeLabels: ex, max: 3 });
    expect(m.some((x) => x.label === "Разобрать тренировку")).toBe(false);
    expect(m.some((x) => x.label === "Как помочь дома")).toBe(true);
  });

  it("caps at max", () => {
    const text =
      "Разобрать тренировку. Как помочь дома. Фокус на неделю. План на 7 дней.";
    expect(matchArenaQuickActionsInText(text, { max: 2 })).toHaveLength(2);
  });

  it("core flow bubble: only whitelist, fixed priority order", () => {
    const text =
      "Как помочь дома сначала. Потом что это значит для роста. И разобрать тренировку. Фокус на неделю.";
    const m = matchArenaQuickActionsInText(text, {
      allowedOrderedLabels: ARENA_CORE_FLOW_BUBBLE_CHIP_LABEL_ORDER,
      max: 3,
    });
    expect(m.map((x) => x.label)).toEqual([
      "Разобрать тренировку",
      "Что это значит для роста",
      "Как помочь дома",
    ]);
  });

  it("core flow bubble: ignores whitelist labels not in text", () => {
    const m = matchArenaQuickActionsInText("Только разобрать тренировку.", {
      allowedOrderedLabels: ARENA_CORE_FLOW_BUBBLE_CHIP_LABEL_ORDER,
      max: 3,
    });
    expect(m).toHaveLength(1);
    expect(m[0].label).toBe("Разобрать тренировку");
  });
});
