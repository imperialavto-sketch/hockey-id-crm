/**
 * PHASE 6 Step 16: триггеры «решения Арены» поверх SessionMeaning (nextActions + progress).
 * Только фиксация в JSON — без автозадач и без сообщений родителям.
 */

import type { SessionMeaning, SessionMeaningActionTrigger } from "./session-meaning";
import { sessionMeaningPassesNextActionsConfidenceGate } from "./session-meaning";

const MAX_TRIGGERS = 8;
const REASON_MAX = 118;

/** Строже, чем nextActions: не предлагаем «решения» на шумных данных. */
const TRIGGER_MIN_OVERALL = 0.44;
const TRIGGER_MIN_SIGNALS = 2;

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function passesActionTriggerConfidence(meaning: SessionMeaning): boolean {
  const { confidence } = meaning;
  if (confidence.overall < TRIGGER_MIN_OVERALL) return false;
  if (confidence.signalCount < TRIGGER_MIN_SIGNALS) return false;
  return true;
}

/** Step 16/17: общий гейт для actionTriggers и производных suggestedActions. */
export function passesSessionMeaningArenaDerivedGate(meaning: SessionMeaning): boolean {
  if (!sessionMeaningPassesNextActionsConfidenceGate(meaning)) return false;
  if (!passesActionTriggerConfidence(meaning)) return false;
  return true;
}

const REPEAT_NOTE = /прошл|та же|в работе|близка к прошлой|узнаваем/i;
const TEAM_MORE_ATTN = /больше|новые командные|появились новые/i;
const TEAM_POS = /меньше|узнаваем/i;

/**
 * Строит список триггеров для уже собранного смысла (включая progress, если есть).
 */
export function buildSessionMeaningActionTriggers(meaning: SessionMeaning): SessionMeaningActionTrigger[] {
  if (!passesSessionMeaningArenaDerivedGate(meaning)) return [];

  const { progress, players } = meaning;
  const out: SessionMeaningActionTrigger[] = [];
  const seen = new Set<string>();

  const push = (t: SessionMeaningActionTrigger) => {
    const key = `${t.type}:${t.target}:${t.playerId ?? "_"}`;
    if (seen.has(key) || out.length >= MAX_TRIGGERS) return;
    seen.add(key);
    out.push({
      ...t,
      reason: clip(t.reason, REASON_MAX),
    });
  };

  const playerAttention = new Set<string>();

  for (const pp of progress?.players ?? []) {
    if (pp.progress === "regressed") {
      playerAttention.add(pp.playerId);
      push({
        type: "attention_required",
        target: "player",
        playerId: pp.playerId,
        reason: `Усиление зоны внимания относительно прошлой тренировки: ${pp.note}`,
      });
    }
  }

  for (const line of progress?.team ?? []) {
    if (TEAM_MORE_ATTN.test(line)) {
      push({
        type: "attention_required",
        target: "team",
        reason: line,
      });
      break;
    }
  }

  if (progress) {
    for (const pp of progress.players) {
      if (playerAttention.has(pp.playerId)) continue;
      if (pp.progress !== "no_change") continue;
      const pl = players.find((x) => x.playerId === pp.playerId);
      const neg = pl?.negativeCount ?? 0;
      if (neg < 1) continue;
      const looksRepeat = REPEAT_NOTE.test(pp.note) || neg >= 2;
      if (!looksRepeat) continue;
      push({
        type: "extra_training",
        target: "player",
        playerId: pp.playerId,
        reason: `Повторяющаяся зона без сдвига; опора на отметки: ${pp.note}`,
      });
    }
  }

  for (const pp of progress?.players ?? []) {
    if (pp.progress !== "improved") continue;
    push({
      type: "progress_high",
      target: "player",
      playerId: pp.playerId,
      reason: `Явный сдвиг в лучшую сторону: ${pp.note}`,
    });
  }

  for (const line of progress?.team ?? []) {
    if (TEAM_POS.test(line)) {
      push({
        type: "progress_high",
        target: "team",
        reason: line,
      });
      break;
    }
  }

  return out;
}
