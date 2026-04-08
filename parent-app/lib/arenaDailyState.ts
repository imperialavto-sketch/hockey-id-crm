/**
 * Ежедневный «сброс» Арены: детерминированный тон и короткая микро-фраза.
 * Без LLM, без backend. Не меняет тексты Today/insight — только слой привычки.
 */

import type { CoachMarkPlayerContext } from "@/services/chatService";
import type { ArenaContinuitySnapshot } from "@/services/coachMarkMemory";
import { hasAnyPlayerSignal } from "@/lib/arenaWeeklySummary";

export type ArenaDailyTone = "focus" | "support" | "light" | "reinforce";

export type ArenaDailyState = {
  dailyKey: string;
  dailyTone: ArenaDailyTone;
  dailyMessage: string;
  /** true, если в хранилище был другой календарный день до этого визита */
  isNewDay: boolean;
  /** Показывать микро-строку только на первом заходе в новый день (не дублировать в тот же день) */
  showMicroLine: boolean;
};

const MS_DAY = 86_400_000;

const POOL_LIGHT = [
  "Сегодня — мягкий старт, без лишней суеты.",
  "День можно начать с одного маленького шага.",
  "Сегодня достаточно спокойного внимания.",
  "Небольшой шаг сегодня уже имеет значение.",
  "Один короткий фокус на сегодня — без перегруза.",
] as const;

const POOL_SUPPORT = [
  "На сегодня — бережный фокус, без давления.",
  "Сегодня лучше опереться на спокойную поддержку.",
  "Один спокойный угол внимания на сегодня — уже достаточно.",
  "Сегодня можно снять лишний шум вокруг ошибок.",
] as const;

const POOL_FOCUS = [
  "На сегодня — спокойный фокус.",
  "Сегодня достаточно одного ясного приоритета.",
  "Маленький ясный шаг сегодня держит курс.",
  "Сегодня — про устойчивость, не про рывок.",
] as const;

const POOL_REINFORCE = [
  "Сегодня можно закрепить результат.",
  "Хороший день, чтобы поддержать то, что уже получается.",
  "Сегодня — про спокойное укрепление сигналов.",
  "Небольшой шаг сегодня закрепит то, что уже движется.",
] as const;

export function formatArenaDailyKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function continuityAgeDays(snapshot: ArenaContinuitySnapshot | null | undefined): number {
  if (!snapshot?.updatedAt) return 0;
  const t = new Date(snapshot.updatedAt).getTime();
  if (!Number.isFinite(t)) return 0;
  return (Date.now() - t) / MS_DAY;
}

function minEvaluation(ctx: CoachMarkPlayerContext): number | null {
  const e = ctx.latestSessionEvaluation;
  if (!e) return null;
  const nums = [e.effort, e.focus, e.discipline].filter(
    (x): x is number => typeof x === "number"
  );
  return nums.length ? Math.min(...nums) : null;
}

function hasReinforceSignals(ctx: CoachMarkPlayerContext): boolean {
  const m = minEvaluation(ctx);
  if (m !== null && m >= 4) return true;
  const hl = ctx.latestLiveTrainingSummary?.highlights?.some((x) => x && x.trim());
  if (hl) return true;
  const str = ctx.aiAnalysis?.strengths?.some((x) => x && x.trim());
  if (str) return true;
  const a = ctx.attendanceSummary;
  if (
    a &&
    typeof a.attendanceRate === "number" &&
    a.attendanceRate >= 82 &&
    (a.totalSessions ?? 0) >= 4
  ) {
    return true;
  }
  return false;
}

function pickVariantIndex(
  dailyKey: string,
  playerId: string,
  tone: ArenaDailyTone,
  staleBucket: number
): number {
  const tid =
    tone === "focus" ? 1 : tone === "support" ? 2 : tone === "light" ? 3 : 4;
  let h = tid * 1009 + staleBucket * 17;
  for (let i = 0; i < dailyKey.length; i++) {
    h = (h + dailyKey.charCodeAt(i) * (i + 1)) | 0;
  }
  for (let i = 0; i < playerId.length; i++) {
    h = (h + playerId.charCodeAt(i) * (i + 3)) | 0;
  }
  return Math.abs(h);
}

/**
 * lastSeenDailyKey — значение из AsyncStorage до текущего визита.
 * `undefined` = ещё не загрузили — микро-слой не показываем (избегаем мигания).
 */
export function deriveArenaDailyState(
  playerContext: CoachMarkPlayerContext | null | undefined,
  continuity: ArenaContinuitySnapshot | null | undefined,
  currentDate: Date,
  lastSeenDailyKey: string | null | undefined
): ArenaDailyState {
  const dailyKey = formatArenaDailyKey(currentDate);
  const pid = playerContext?.id?.trim() ?? "";
  const loaded = lastSeenDailyKey !== undefined;
  const isNewDay = loaded && lastSeenDailyKey !== dailyKey;

  const staleDays = continuityAgeDays(continuity);
  const staleBucket = Math.min(7, Math.floor(staleDays));

  if (!pid) {
    return {
      dailyKey,
      dailyTone: "light",
      dailyMessage: "",
      isNewDay: Boolean(isNewDay),
      showMicroLine: false,
    };
  }

  let tone: ArenaDailyTone = "focus";
  if (!playerContext || !hasAnyPlayerSignal(playerContext)) {
    tone = "light";
  } else {
    const min = minEvaluation(playerContext);
    if (min !== null && min <= 2) {
      tone = "support";
    } else if (hasReinforceSignals(playerContext)) {
      tone = "reinforce";
    } else if (staleDays >= 2.5) {
      tone = "light";
    } else {
      tone = "focus";
    }
  }

  const pool =
    tone === "light"
      ? POOL_LIGHT
      : tone === "support"
        ? POOL_SUPPORT
        : tone === "reinforce"
          ? POOL_REINFORCE
          : POOL_FOCUS;
  const idx = pickVariantIndex(dailyKey, pid, tone, staleBucket) % pool.length;
  const dailyMessage = pool[idx] ?? pool[0];

  return {
    dailyKey,
    dailyTone: tone,
    dailyMessage,
    isNewDay: Boolean(isNewDay),
    showMicroLine: loaded && isNewDay && Boolean(dailyMessage),
  };
}
