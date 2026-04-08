import type { ParentTrainingBehaviorAxisExplainability } from "@/services/playerService";

type ParentBehaviorTone =
  | "none"
  | "positive"
  | "negative"
  | "mixed"
  | "low_data"
  | "neutral_only";

type ParentBehaviorToneNonNone = Exclude<ParentBehaviorTone, "none">;

function classifyTone(
  p: number,
  n: number,
  u: number
): ParentBehaviorTone {
  const t = p + n + u;
  if (t === 0) return "none";
  if (t <= 2) return "low_data";
  if (p === 0 && n === 0 && u > 0) return "neutral_only";
  if (p === n && p > 0) return "mixed";
  if (n === 0 && p > 0) return "positive";
  if (p === 0 && n > 0) return "negative";
  if (p >= 2 * n + 1) return "positive";
  if (n >= 2 * p + 1) return "negative";
  return "mixed";
}

function toneFromAxis(
  axis: ParentTrainingBehaviorAxisExplainability | undefined
): ParentBehaviorTone {
  if (!axis || axis.totalSignals <= 0) return "none";
  return classifyTone(axis.positiveCount, axis.negativeCount, axis.neutralCount);
}

const MERGE_PREFIX = "По вниманию и организации на занятии: ";

const MERGED_BODY: Record<ParentBehaviorToneNonNone, string> = {
  positive: "в целом всё хорошо, ребёнок уверенно держался.",
  negative:
    "есть моменты, на которые стоит обратить внимание и мягко поддержать.",
  mixed: "получалось по-разному: были и удачные отрезки, и непростые.",
  low_data: "наблюдений пока мало — рано делать окончательный вывод.",
  neutral_only: "прошло спокойно, без ярких всплесков.",
};

const FOCUS_LINE: Record<ParentBehaviorToneNonNone, string> = {
  positive: "Концентрация — в целом хорошая, внимание в основном держал.",
  negative:
    "Концентрация — попадались отвлечения; можно мягко помочь удерживать внимание.",
  mixed: "Концентрация — получалось по-разному: и собранность, и отвлечения.",
  low_data: "Концентрация — пока мало наблюдений; вывод предварительный.",
  neutral_only: "Концентрация — прошла ровно, без особых отметок.",
};

const DISC_LINE: Record<ParentBehaviorToneNonNone, string> = {
  positive: "Организация на занятии — в целом в порядке.",
  negative:
    "Организация на занятии — встречались моменты, когда сложнее следовать ритму группы.",
  mixed: "Организация на занятии — получалось по-разному.",
  low_data: "Организация на занятии — пока мало наблюдений; вывод предварительный.",
  neutral_only: "Организация на занятии — без особых отметок, всё спокойно.",
};

export type ParentBehaviorExplainabilityInput = {
  focus?: ParentTrainingBehaviorAxisExplainability;
  discipline?: ParentTrainingBehaviorAxisExplainability;
};

/**
 * Человекочитаемые строки для родителя: без цифр и без внутренних терминов тренера.
 * Возвращает null, если по обеим осям нет данных.
 */
export function buildParentBehaviorHumanLines(
  input: ParentBehaviorExplainabilityInput | undefined
): string[] | null {
  if (!input) return null;
  const fTone = toneFromAxis(input.focus);
  const dTone = toneFromAxis(input.discipline);

  if (fTone === "none" && dTone === "none") return null;

  if (fTone !== "none" && dTone === "none") {
    return [FOCUS_LINE[fTone as ParentBehaviorToneNonNone]];
  }
  if (fTone === "none" && dTone !== "none") {
    return [DISC_LINE[dTone as ParentBehaviorToneNonNone]];
  }

  if (fTone === dTone) {
    return [
      `${MERGE_PREFIX}${MERGED_BODY[fTone as ParentBehaviorToneNonNone]}`,
    ];
  }

  return [
    FOCUS_LINE[fTone as ParentBehaviorToneNonNone],
    DISC_LINE[dTone as ParentBehaviorToneNonNone],
  ];
}
