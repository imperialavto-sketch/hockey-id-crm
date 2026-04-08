/**
 * STEP 24: производная «влияние внешней работы» на текущую сессию.
 * Только чтение SessionMeaning.progress + carry из planningSnapshotJson; SessionMeaning не меняем.
 */

import type { LiveTrainingPlanningSnapshotDto } from "./live-training-planning-snapshot";
import type { SessionMeaning, SessionMeaningPlayerProgress } from "./session-meaning";

/** Совпадает с порогом actionTriggers — не заявляем чёткий вывод на «шумных» данных. */
const IMPACT_LOW_OVERALL = 0.44;
const IMPACT_MIN_SIGNALS = 2;
const NOTE_MAX = 220;

export type ExternalWorkImpactStatusV1 = "helped" | "no_clear_effect" | "needs_more_time";

export type ExternalWorkImpactRowV1 = {
  playerId?: string;
  playerName: string;
  status: ExternalWorkImpactStatusV1;
  note: string;
};

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function confirmedCarryDisplayable(
  c: LiveTrainingPlanningSnapshotDto["confirmedExternalDevelopmentCarry"]
): boolean {
  return Boolean(c && c.source === "external_coach" && c.coachName?.trim());
}

function feedbackCarryDisplayable(
  c: LiveTrainingPlanningSnapshotDto["externalCoachFeedbackCarry"]
): boolean {
  return Boolean(c?.coachName?.trim() && c.summary?.trim());
}

function carryTouchesPlayer(
  playerId: string,
  carry: { playerId?: string } | null | undefined,
  displayable: boolean
): boolean {
  if (!displayable || !carry) return false;
  const pid = carry.playerId?.trim();
  if (!pid) return true;
  return pid === playerId;
}

function lowConfidenceForImpact(meaning: SessionMeaning): boolean {
  return (
    meaning.confidence.overall < IMPACT_LOW_OVERALL ||
    meaning.confidence.signalCount < IMPACT_MIN_SIGNALS
  );
}

function noteForRow(
  progressNote: string,
  status: ExternalWorkImpactStatusV1
): string {
  const raw = progressNote.trim();
  if (raw) return clip(raw, NOTE_MAX);
  if (status === "helped") {
    return "Относительно прошлой подтверждённой тренировки зафиксировано улучшение.";
  }
  if (status === "no_clear_effect") {
    return "Относительно прошлой подтверждённой тренировки явных изменений не видно.";
  }
  return "Для уверенного вывода по влиянию дополнительной работы пока мало опоры в данных.";
}

/**
 * Одна строка на игрока из SessionMeaning.progress.players при наличии связанного carry.
 */
export function buildExternalWorkImpactV1(input: {
  meaning: SessionMeaning | null;
  confirmedCarry: LiveTrainingPlanningSnapshotDto["confirmedExternalDevelopmentCarry"];
  feedbackCarry: LiveTrainingPlanningSnapshotDto["externalCoachFeedbackCarry"];
}): ExternalWorkImpactRowV1[] {
  const { meaning, confirmedCarry, feedbackCarry } = input;
  if (!meaning?.progress?.players?.length) return [];

  const confOk = confirmedCarryDisplayable(confirmedCarry);
  const fbOk = feedbackCarryDisplayable(feedbackCarry);
  if (!confOk && !fbOk) return [];

  const low = lowConfidenceForImpact(meaning);
  const out: ExternalWorkImpactRowV1[] = [];

  for (const p of meaning.progress.players) {
    const row = rowForPlayer(p, { confOk, fbOk, confirmedCarry, feedbackCarry, low });
    if (row) out.push(row);
  }

  return out;
}

function rowForPlayer(
  p: SessionMeaningPlayerProgress,
  ctx: {
    confOk: boolean;
    fbOk: boolean;
    confirmedCarry: LiveTrainingPlanningSnapshotDto["confirmedExternalDevelopmentCarry"];
    feedbackCarry: LiveTrainingPlanningSnapshotDto["externalCoachFeedbackCarry"];
    low: boolean;
  }
): ExternalWorkImpactRowV1 | null {
  const hasConf = carryTouchesPlayer(p.playerId, ctx.confirmedCarry, ctx.confOk);
  const hasFb = carryTouchesPlayer(p.playerId, ctx.feedbackCarry, ctx.fbOk);
  const hasAny = hasConf || hasFb;
  if (!hasAny) return null;

  let status: ExternalWorkImpactStatusV1;
  if (hasConf && p.progress === "improved") {
    status = "helped";
  } else if (p.progress === "no_change" && hasAny) {
    status = "no_clear_effect";
  } else if (p.progress === "regressed" && hasAny) {
    status = "needs_more_time";
  } else if (p.progress === "improved" && !hasConf && hasFb) {
    status = "needs_more_time";
  } else {
    status = "needs_more_time";
  }

  if (ctx.low && (status === "helped" || status === "no_clear_effect")) {
    status = "needs_more_time";
  }

  const name = p.playerName?.trim() || "Игрок";
  return {
    playerId: p.playerId,
    playerName: name,
    status,
    note: noteForRow(p.note, status),
  };
}
