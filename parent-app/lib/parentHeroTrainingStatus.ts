import type { ScheduleItem } from "@/types";

/** Длительность сессии по умолчанию, если API не прислал endTime */
export const HERO_DEFAULT_SESSION_MS = 90 * 60 * 1000;

const MS_HOUR = 60 * 60 * 1000;
const MS_MIN = 60 * 1000;
const TWENTY_FOUR_H_MS = 24 * MS_HOUR;

export type HeroTrainingPillVariant = "calm" | "soon" | "live";

export interface HeroTrainingPillModel {
  label: string;
  variant: HeroTrainingPillVariant;
  isLiveStyle: boolean;
  remainingMinutesUntilStart?: number;
  remainingMsUntilStart?: number;
}

export function parseScheduleStartMs(item: ScheduleItem): number | null {
  if (!item.startAt) return null;
  const ms = Date.parse(item.startAt);
  return Number.isFinite(ms) ? ms : null;
}

export function parseScheduleEndMs(item: ScheduleItem, startMs: number): number {
  if (item.endAt) {
    const ms = Date.parse(item.endAt);
    if (Number.isFinite(ms) && ms > startMs) return ms;
  }
  return startMs + HERO_DEFAULT_SESSION_MS;
}

/**
 * Ближайшее событие: ещё не закончилось по endAt.
 * Элементы без startAt в конце списка (последний резерв «есть в плане, но без точного времени»).
 */
export function pickNextHeroScheduleItem(
  items: ScheduleItem[],
  nowMs: number = Date.now()
): ScheduleItem | null {
  if (!items.length) return null;

  const withTime = items.filter((i) => parseScheduleStartMs(i) != null);
  const withoutTime = items.filter((i) => parseScheduleStartMs(i) == null);

  const timedSorted = [...withTime].sort(
    (a, b) => (parseScheduleStartMs(a) ?? 0) - (parseScheduleStartMs(b) ?? 0)
  );

  for (const item of timedSorted) {
    const startMs = parseScheduleStartMs(item)!;
    const endMs = parseScheduleEndMs(item, startMs);
    if (nowMs < endMs) return item;
  }

  return withoutTime[0] ?? null;
}

export interface HeroPillScheduleContext {
  /** Первый ответ по расписанию для текущего игрока уже получен */
  scheduleReady: boolean;
  /** Ошибка сети/API при загрузке расписания */
  scheduleError: boolean;
}

/**
 * Текст и тон верхнего pill главного hero относительно одного выбранного события
 * (уже «следующее» по {@link pickNextHeroScheduleItem}).
 */
export function getHeroTrainingPillModel(
  next: ScheduleItem | null,
  ctx: HeroPillScheduleContext,
  nowMs: number = Date.now()
): HeroTrainingPillModel {
  if (ctx.scheduleError) {
    return {
      label: "ПЛАН НЕ ДОСТУПЕН",
      variant: "calm",
      isLiveStyle: false,
    };
  }

  if (!ctx.scheduleReady) {
    return {
      label: "ЗАГРУЗКА ПЛАНА…",
      variant: "calm",
      isLiveStyle: false,
    };
  }

  if (!next) {
    return {
      label: "ТРЕНИРОВОК ПОКА НЕТ",
      variant: "calm",
      isLiveStyle: false,
    };
  }

  const startMs = parseScheduleStartMs(next);
  if (startMs == null) {
    return {
      label: "СКОРО ТРЕНИРОВКА",
      variant: "soon",
      isLiveStyle: false,
    };
  }

  const endMs = parseScheduleEndMs(next, startMs);

  if (nowMs >= startMs && nowMs < endMs) {
    return {
      label: "ИДЁТ ТРЕНИРОВКА",
      variant: "live",
      isLiveStyle: true,
    };
  }

  const untilStart = startMs - nowMs;

  if (untilStart > TWENTY_FOUR_H_MS) {
    return {
      label: "СКОРО ТРЕНИРОВКА",
      variant: "calm",
      isLiveStyle: false,
    };
  }

  if (untilStart > 60 * MS_MIN) {
    const hours = Math.max(1, Math.ceil(untilStart / MS_HOUR));
    return {
      label: `ДО ТРЕНИРОВКИ ${hours} Ч`,
      variant: "soon",
      isLiveStyle: false,
      remainingMsUntilStart: untilStart,
      remainingMinutesUntilStart: Math.ceil(untilStart / MS_MIN),
    };
  }

  if (untilStart > MS_MIN) {
    const mins = Math.max(1, Math.ceil(untilStart / MS_MIN));
    return {
      label: `LIVE через ${mins} мин`,
      variant: "live",
      isLiveStyle: true,
      remainingMsUntilStart: untilStart,
      remainingMinutesUntilStart: mins,
    };
  }

  return {
    label: "LIVE СЕЙЧАС",
    variant: "live",
    isLiveStyle: true,
    remainingMsUntilStart: Math.max(0, untilStart),
    remainingMinutesUntilStart: 0,
  };
}
