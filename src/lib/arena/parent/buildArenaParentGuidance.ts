/**
 * Детерминированные формулировки поверх arenaSummary и черновиков — без LLM и без продуктовых рекомендаций.
 */

import type { ArenaCoachDecisionDto } from "@/lib/arena/decision/arenaCoachDecisionTypes";
import type { ArenaObservationInterpretation } from "@/lib/arena/interpretation/arenaInterpretationTypes";
import type { ArenaParentExplanation } from "@/lib/arena/parent/arenaParentExplanationTypes";
import type { ArenaParentSummary } from "@/lib/arena/parent/arenaParentSummaryTypes";
import { buildArenaParentSummary } from "@/lib/arena/parent/buildArenaParentSummary";
import type { ArenaParentGuidance, ArenaParentGuidanceLevel } from "./arenaParentGuidanceTypes";

export type ArenaParentGuidanceDraftInput = {
  interpretation?: ArenaObservationInterpretation | null;
  coachDecision?: ArenaCoachDecisionDto | null;
  parentExplanation?: ArenaParentExplanation | null;
};

export type BuildArenaParentGuidanceInput = {
  arenaSummary: ArenaParentSummary | null | undefined;
  draftInputs: ArenaParentGuidanceDraftInput[];
};

function countPosNeg(drafts: ArenaParentGuidanceDraftInput[]): { pos: number; neg: number } {
  let pos = 0;
  let neg = 0;
  for (const d of drafts) {
    const i = d.interpretation;
    if (!i) continue;
    if (i.signalKind === "success" || (i.signalKind === "neutral_observation" && i.direction === "positive")) {
      pos += 1;
    } else if (i.signalKind === "mistake" || i.direction === "negative") {
      neg += 1;
    }
  }
  return { pos, neg };
}

function pickGuidanceLevel(
  progressState: "positive" | "mixed" | "attention",
  drafts: ArenaParentGuidanceDraftInput[]
): ArenaParentGuidanceLevel {
  const attentionExplCount = drafts.filter((d) => Boolean(d.parentExplanation?.attention)).length;
  const anyHigh = drafts.some((d) => d.coachDecision?.reviewPriority === "high");
  const anyRepeated = drafts.some((d) => Boolean(d.coachDecision?.repeatedConcernInSession));
  const mediumCount = drafts.filter((d) => d.coachDecision?.reviewPriority === "medium").length;
  const { pos, neg } = countPosNeg(drafts);
  const mixedMoments = pos > 0 && neg > 0;

  if (
    progressState === "attention" ||
    anyHigh ||
    anyRepeated ||
    attentionExplCount >= 2
  ) {
    return "important";
  }

  if (
    progressState === "mixed" ||
    mediumCount >= 2 ||
    mixedMoments ||
    attentionExplCount === 1
  ) {
    return "focus";
  }

  if (progressState === "positive" && !anyHigh && !anyRepeated && attentionExplCount === 0) {
    return "light";
  }

  return "focus";
}

function titleForLevel(level: ArenaParentGuidanceLevel): string {
  switch (level) {
    case "light":
      return "Сейчас главное — сохранять этот темп";
    case "focus":
      return "Сейчас важно держать это в фокусе";
    case "important":
    default:
      return "Сейчас этому стоит уделить особое внимание";
  }
}

function textForLevel(level: ArenaParentGuidanceLevel): string {
  switch (level) {
    case "light":
      return "Спокойный фон и привычный ритм рядом помогают закреплять то, что уже получается. Один день редко даёт полную картину — мягче смотреть на серию тренировок, без спешки с выводами.";
    case "focus":
      return "Полезно бережно удерживать внимание на том, что отражено в отметках — без давления и без тотальной оценки «день удался / не удался». Ровный тон и поддержка рядом заметно помогают ребёнку.";
    case "important":
    default:
      return "Имеет смысл мягко наблюдать за самочувствием и настроением — не как контроль, а как забота о комфорте в учёбе. Если что-то беспокоит, спокойный разговор с тренером может прояснить контекст без срочных решений.";
  }
}

export function buildArenaParentGuidance(input: BuildArenaParentGuidanceInput): ArenaParentGuidance | null {
  const { arenaSummary, draftInputs } = input;
  if (draftInputs.length === 0 && !arenaSummary) return null;

  const built = buildArenaParentSummary({ drafts: draftInputs });
  const progressState =
    arenaSummary?.progressState ?? built?.progressState ?? ("mixed" as const);

  const level = pickGuidanceLevel(progressState, draftInputs);

  return {
    guidanceTitle: titleForLevel(level),
    guidanceText: textForLevel(level),
    guidanceLevel: level,
  };
}
