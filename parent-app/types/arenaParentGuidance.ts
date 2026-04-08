export type ArenaParentGuidanceLevel = "light" | "focus" | "important";

export type ArenaParentGuidance = {
  guidanceTitle: string;
  guidanceText: string;
  guidanceLevel: ArenaParentGuidanceLevel;
};

export function parseArenaParentGuidance(raw: unknown): ArenaParentGuidance | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const guidanceTitle = typeof o.guidanceTitle === "string" ? o.guidanceTitle.trim() : "";
  const guidanceText = typeof o.guidanceText === "string" ? o.guidanceText.trim() : "";
  const gl = o.guidanceLevel;
  if (!guidanceTitle || !guidanceText) return null;
  if (gl !== "light" && gl !== "focus" && gl !== "important") return null;
  return { guidanceTitle, guidanceText, guidanceLevel: gl };
}
