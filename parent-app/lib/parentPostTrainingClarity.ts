import { ARENA_TRAINING_DATA_PENDING_MESSAGE } from "@/components/live-training/ParentLiveTrainingHeroBlock";
import type { LatestSessionReport } from "@/services/playerService";
import type { ParentLiveTrainingHeroPayload } from "@/types/parentLatestLiveTrainingSummary";

/** Совпадает с тем, что реально показывается в «Комментарий тренера» (включая coachNote). */
function hasPublishedCoachCommentBody(report: LatestSessionReport | null): boolean {
  if (!report) return false;
  const main =
    report.parentMessage?.trim() ||
    report.summary?.trim() ||
    report.coachNote?.trim() ||
    "";
  const focus = report.focusAreas?.trim() ?? "";
  return Boolean(main || focus);
}

function heroHasParentFacingSummary(hero: ParentLiveTrainingHeroPayload): boolean {
  if (hero.summary || hero.guidance) return true;
  const fb = hero.fallbackLine?.trim() ?? "";
  if (!fb || fb === ARENA_TRAINING_DATA_PENDING_MESSAGE) return false;
  return true;
}

export type ParentPostTrainingClarityModel = {
  title: string;
  lines: string[];
};

/**
 * Короткий родительский контекст без дубля текста отчёта или Arena: только навигация по смыслу экрана.
 */
export function buildParentPostTrainingClarityModel(
  report: LatestSessionReport | null,
  hero: ParentLiveTrainingHeroPayload
): ParentPostTrainingClarityModel | null {
  const hasCoachBlock = hasPublishedCoachCommentBody(report);
  const hasArenaBlock = heroHasParentFacingSummary(hero);
  if (!hasCoachBlock && !hasArenaBlock) return null;

  const lines: string[] = [];
  if (hasCoachBlock) {
    lines.push(
      "Разбор тренера по последней тренировке — в блоке «Комментарий тренера» выше."
    );
  }
  if (hasArenaBlock) {
    lines.push(
      "Ниже — короткая сводка по тренировке: на что сейчас обращаем внимание."
    );
  }
  if (lines.length === 0) return null;
  return { title: "Сейчас в работе", lines: lines.slice(0, 2) };
}
