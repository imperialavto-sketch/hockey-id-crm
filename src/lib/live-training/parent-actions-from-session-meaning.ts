/**
 * PHASE 6 Step 14: действия для родителя из SessionMeaning.nextActions (простой язык, без «обещаний»).
 */

import type { SessionMeaning, SessionMeaningNextActions } from "./session-meaning";
import { sessionMeaningPassesNextActionsConfidenceGate } from "./session-meaning";

export type LiveTrainingParentMeaningActionRow = {
  playerId: string;
  playerName: string;
  actions: string[];
};

const MAX_ACTIONS_PER_PLAYER = 3;
const MAX_LINE = 118;

/** Убрать формулировки, которые звучат как гарантия результата. */
const OVERPROMISE = /гарант|обещ|обязательно\s+добь|100\s*%|точно\s+будет/i;

/** Лёгкая подмена «технических» ключей на разговорные слова (без тренерского жаргона). */
function escapeRegExpChars(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const DOMAIN_TOKEN_RU: Record<string, string> = {
  puck_control: "работа с шайбой",
  skating: "катание",
  shooting: "броски",
  pace: "темп",
  workrate: "включённость",
  ofp: "общая физподготовка",
  behavior: "поведение и дисциплина",
  attention: "внимание к заданию",
  coachability: "восприятие обратной связи",
  engagement: "вовлечённость",
  general: "общий фокус",
};

function clip(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function softenCoachActionLineForParent(raw: string): string {
  let s = raw.trim().replace(/\s+/g, " ");
  if (!s) return "";
  if (OVERPROMISE.test(s)) return "";

  for (const [key, label] of Object.entries(DOMAIN_TOKEN_RU)) {
    const re = new RegExp(`\\b${escapeRegExpChars(key)}\\b`, "gi");
    s = s.replace(re, label);
  }
  s = s.replace(/_/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return "";

  const looksHome =
    /дома|вне\s+льда|домой|утром|вечером|растяж|зарядк|прогул|сон|питан|школ|поддерж|поговор|вместе|10|15|20|минут/i.test(
      s
    );
  if (!looksHome && s.length > 0) {
    const first = s.charAt(0).toLowerCase();
    const rest = s.slice(1);
    s = `Вне льда полезно: ${first}${rest}`;
  }

  return clip(s, MAX_LINE);
}

function rowsFromNextActions(na: SessionMeaningNextActions): LiveTrainingParentMeaningActionRow[] {
  const out: LiveTrainingParentMeaningActionRow[] = [];
  for (const p of na.players) {
    const playerId = typeof p.playerId === "string" ? p.playerId.trim() : "";
    const playerName = typeof p.playerName === "string" ? p.playerName.trim().slice(0, 120) : "";
    if (!playerId || !playerName) continue;
    const actions = p.actions
      .map(softenCoachActionLineForParent)
      .filter(Boolean)
      .slice(0, MAX_ACTIONS_PER_PLAYER);
    if (actions.length === 0) continue;
    out.push({ playerId, playerName, actions });
  }
  return out;
}

/**
 * Полный смысл сессии: гейт по уверенности + только блок `nextActions.players`.
 */
export function buildParentActionsFromSessionMeaning(
  meaning: SessionMeaning | null | undefined
): LiveTrainingParentMeaningActionRow[] {
  if (!meaning || !sessionMeaningPassesNextActionsConfidenceGate(meaning)) return [];
  if (!meaning.nextActions) return [];
  return rowsFromNextActions(meaning.nextActions);
}

/**
 * Только из nextActions (уже отфильтрованного при сборке смысла) — для coach parent preview по summaryJson.
 */
export function buildParentActionsFromNextActionsSnapshot(
  na: SessionMeaningNextActions | null | undefined
): LiveTrainingParentMeaningActionRow[] {
  if (!na) return [];
  return rowsFromNextActions(na);
}
