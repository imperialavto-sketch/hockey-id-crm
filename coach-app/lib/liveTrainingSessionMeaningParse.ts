/**
 * PHASE 6 Step 11: разбор sessionMeaningJson с сервера (GET session).
 */

import type { LiveTrainingSessionMeaning } from "@/types/liveTraining";

const VERSION = 1;

function isThemeRow(x: unknown): x is LiveTrainingSessionMeaning["themes"][number] {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.key === "string" && typeof o.weight === "number" && Number.isFinite(o.weight);
}

function isFocusRow(x: unknown): x is LiveTrainingSessionMeaning["focus"][number] {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.label === "string" && typeof o.weight === "number" && Number.isFinite(o.weight);
}

function isPlayerRow(x: unknown): x is LiveTrainingSessionMeaning["players"][number] {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.playerId !== "string" || !o.playerId.trim()) return false;
  if (typeof o.playerName !== "string") return false;
  return (
    typeof o.positiveCount === "number" &&
    typeof o.negativeCount === "number" &&
    typeof o.neutralCount === "number" &&
    Array.isArray(o.topThemes)
  );
}

export function parseLiveTrainingSessionMeaningFromApi(raw: unknown): LiveTrainingSessionMeaning | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== VERSION) return null;
  if (typeof o.builtAt !== "string") return null;
  if (!Array.isArray(o.themes) || !Array.isArray(o.focus) || !Array.isArray(o.players)) return null;
  const themes = o.themes.filter(isThemeRow);
  const focus = o.focus.filter(isFocusRow);
  const players = o.players.filter(isPlayerRow).map((p) => ({
    playerId: p.playerId.trim(),
    playerName: p.playerName.trim() || "Игрок",
    positiveCount: p.positiveCount,
    negativeCount: p.negativeCount,
    neutralCount: p.neutralCount,
    topThemes: p.topThemes.filter((t): t is string => typeof t === "string" && t.trim().length > 0),
  }));
  return { version: VERSION, builtAt: o.builtAt, themes, focus, players };
}
