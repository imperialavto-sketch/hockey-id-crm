import { useEffect, useMemo, useState } from "react";
import type { ScheduleItem } from "@/types";
import {
  getHeroTrainingPillModel,
  pickNextHeroScheduleItem,
  type HeroTrainingPillModel,
} from "@/lib/parentHeroTrainingStatus";

const TICK_MS = 30_000;

export type HeroTrainingPillHookResult = {
  pill: HeroTrainingPillModel;
  /** Событие для блока «Следующее в плане» (с тем же `now`, что и pill) */
  nextItem: ScheduleItem | null;
};

/**
 * Живой статус ближайшей тренировки для hero-pill: пересчёт каждые 30 с, cleanup при unmount.
 */
export function useHeroTrainingPillState(
  items: ScheduleItem[],
  scheduleReady: boolean,
  scheduleError: boolean
): HeroTrainingPillHookResult {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    void tick;
    const now = Date.now();
    const nextItem =
      scheduleError || !scheduleReady ? null : pickNextHeroScheduleItem(items, now);
    const pill = getHeroTrainingPillModel(nextItem, { scheduleReady, scheduleError }, now);
    return { pill, nextItem };
  }, [items, scheduleError, scheduleReady, tick]);
}
