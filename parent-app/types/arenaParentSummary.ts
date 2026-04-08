export type ArenaParentProgressState = "positive" | "mixed" | "attention";

export type ArenaParentSummary = {
  summaryTitle: string;
  summaryText: string;
  progressState: ArenaParentProgressState;
};

export function parseArenaParentSummary(raw: unknown): ArenaParentSummary | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const summaryTitle = typeof o.summaryTitle === "string" ? o.summaryTitle.trim() : "";
  const summaryText = typeof o.summaryText === "string" ? o.summaryText.trim() : "";
  const ps = o.progressState;
  if (!summaryTitle || !summaryText) return null;
  if (ps !== "positive" && ps !== "mixed" && ps !== "attention") return null;
  return { summaryTitle, summaryText, progressState: ps };
}
