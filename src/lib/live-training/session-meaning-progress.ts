/**
 * PHASE 6 Step 15: сравнение SessionMeaning с предыдущей подтверждённой сессией (без LLM).
 */

import type {
  SessionMeaning,
  SessionMeaningPlayerProgress,
  SessionMeaningProgress,
} from "./session-meaning";
import { sessionMeaningPassesNextActionsConfidenceGate } from "./session-meaning";

const MAX_TEAM_LINES = 3;
const MAX_FOCUS_PLAYERS = 6;
const NOTE_MAX = 96;

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function themeOverlap(a: string[], b: string[]): number {
  const sa = new Set(a.map((x) => x.toLowerCase().trim()).filter(Boolean));
  let n = 0;
  for (const x of b) {
    const k = x.toLowerCase().trim();
    if (k && sa.has(k)) n += 1;
  }
  return n;
}

/** Игроки в фокусе: пересечение nextActions с прошлой и текущей сессии; иначе топ по активности. */
function focusPlayerIds(previous: SessionMeaning, current: SessionMeaning): string[] {
  const s = new Set<string>();
  for (const p of previous.nextActions?.players ?? []) {
    const id = p.playerId?.trim();
    if (id) s.add(id);
  }
  for (const p of current.nextActions?.players ?? []) {
    const id = p.playerId?.trim();
    if (id) s.add(id);
  }
  if (s.size > 0) return [...s].slice(0, MAX_FOCUS_PLAYERS);
  return current.players
    .slice()
    .sort(
      (a, b) =>
        b.negativeCount +
        b.positiveCount +
        b.neutralCount -
        (a.negativeCount + a.positiveCount + a.neutralCount)
    )
    .slice(0, 4)
    .map((p) => p.playerId);
}

export function buildSessionMeaningProgressBlock(
  previous: SessionMeaning,
  current: SessionMeaning
): SessionMeaningProgress | undefined {
  if (!sessionMeaningPassesNextActionsConfidenceGate(previous)) return undefined;
  if (!sessionMeaningPassesNextActionsConfidenceGate(current)) return undefined;
  if (previous.context.liveTrainingSessionId === current.context.liveTrainingSessionId) {
    return undefined;
  }
  const signalSum = previous.confidence.signalCount + current.confidence.signalCount;
  if (signalSum < 2) return undefined;

  const pIds = focusPlayerIds(previous, current);
  if (pIds.length === 0) return undefined;

  const team: string[] = [];
  const prevAttn = previous.team.needsAttentionLines.length;
  const currAttn = current.team.needsAttentionLines.length;
  if (prevAttn > 0 && currAttn < prevAttn) {
    team.push(
      clip("Командных акцентов внимания стало меньше, чем на прошлой тренировке.", NOTE_MAX)
    );
  } else if (prevAttn === 0 && currAttn >= 2) {
    team.push(clip("Появились новые командные акценты внимания.", NOTE_MAX));
  } else if (prevAttn > 0 && currAttn > prevAttn) {
    team.push(clip("Командных сигналов внимания стало больше.", NOTE_MAX));
  }

  const topPrev = [...previous.themes].sort((a, b) => b.weight - a.weight).slice(0, 4).map((t) => t.key);
  const topCurr = [...current.themes].sort((a, b) => b.weight - a.weight).slice(0, 4).map((t) => t.key);
  const thOv = themeOverlap(topPrev, topCurr);
  if (team.length < MAX_TEAM_LINES && thOv >= 2 && currAttn <= prevAttn) {
    team.push(clip("Ключевые темы узнаваемы относительно прошлой тренировки.", NOTE_MAX));
  }

  const prevNextByPlayer = new Map(
    (previous.nextActions?.players ?? []).map((p) => [p.playerId, p.actions.join(" ").toLowerCase()])
  );

  const players: SessionMeaningPlayerProgress[] = [];
  for (const pid of pIds) {
    const pPrev = previous.players.find((x) => x.playerId === pid);
    const pCurr = current.players.find((x) => x.playerId === pid);
    if (!pCurr) continue;

    const prevN = pPrev?.negativeCount ?? 0;
    const currN = pCurr.negativeCount;
    const prevP = pPrev?.positiveCount ?? 0;
    const currP = pCurr.positiveCount;
    const prevT = pPrev?.topThemes ?? [];
    const currT = pCurr.topThemes;
    const tOv = themeOverlap(prevT, currT);
    const prevCarry = prevNextByPlayer.get(pid) ?? "";

    let progress: SessionMeaningPlayerProgress["progress"] = "no_change";
    let note = "Заметных сдвигов в отметках немного.";

    if (prevN >= 1 && currN < prevN) {
      progress = "improved";
      note = "Меньше отметок внимания, чем в прошлый раз.";
    } else if (currN > prevN && currN >= 2) {
      progress = "regressed";
      note = "Больше отметок внимания, чем на прошлой тренировке.";
    } else if (prevN === 0 && currN === 0 && currP > prevP) {
      progress = "improved";
      note = "Больше позитивных отметок, чем раньше.";
    } else if (prevN > 0 && currN === prevN && tOv >= 1) {
      progress = "no_change";
      note = "Та же зона в отметках тренера.";
    } else if (
      prevCarry &&
      currT.some((d) => prevCarry.includes(d.toLowerCase())) &&
      currN >= prevN
    ) {
      progress = "no_change";
      note = "Фокус прошлой тренировки ещё в работе.";
    } else if (currN === prevN && currP === prevP && tOv >= 2) {
      progress = "no_change";
      note = "Картина по темам близка к прошлой тренировке.";
    }

    players.push({
      playerId: pid,
      playerName: pCurr.playerName,
      progress,
      note: clip(note, NOTE_MAX),
    });
  }

  if (players.length === 0) return undefined;

  team.splice(MAX_TEAM_LINES);
  return { team, players: players.slice(0, MAX_FOCUS_PLAYERS) };
}
