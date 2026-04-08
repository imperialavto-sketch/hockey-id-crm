/**
 * Детерминированные шаблоны: interpretation (+ опционально coachDecision) → текст для родителя.
 * Без LLM и без «магии».
 */

import type { ArenaObservationInterpretation } from "@/lib/arena/interpretation/arenaInterpretationTypes";
import type { ArenaParentExplanation, BuildArenaParentExplanationInput } from "./arenaParentExplanationTypes";

function domainGenitive(domain: ArenaObservationInterpretation["domain"]): string {
  switch (domain) {
    case "technical":
      return "технического навыка";
    case "tactical":
      return "игрового понимания";
    case "physical":
      return "физической подготовки";
    case "behavioral":
      return "поведения и внимания";
    case "unclear":
      return "навыка или действия на площадке";
    default: {
      const _x: never = domain;
      return _x;
    }
  }
}

function hedge(confidence: ArenaObservationInterpretation["confidence"]): string {
  return confidence === "low" ? "Похоже, " : "";
}

function explanationFor(i: ArenaObservationInterpretation): string {
  const h = hedge(i.confidence);

  if (i.signalKind === "neutral_observation") {
    if (i.domain === "unclear") {
      if (i.direction === "negative") {
        return `${h}Наблюдается момент на площадке — есть сложности.`;
      }
      if (i.direction === "positive") {
        return `${h}Наблюдается момент на площадке — есть прогресс.`;
      }
      return `${h}Наблюдается ситуация на площадке без явной оценки «лучше» или «хуже».`;
    }
    const z = domainGenitive(i.domain);
    if (i.direction === "negative") {
      return `${h}В зоне ${z} наблюдается момент — есть сложности.`;
    }
    if (i.direction === "positive") {
      return `${h}В зоне ${z} наблюдается момент — есть прогресс.`;
    }
    return `${h}В зоне ${z} наблюдается момент без явной оценки прогресса или затруднений.`;
  }

  const mistakeOrSuccess =
    i.signalKind === "mistake"
      ? "пока не получается стабильно"
      : "хорошо справляется";

  const tail =
    i.direction === "negative"
      ? " — есть сложности"
      : i.direction === "positive"
        ? " — есть прогресс"
        : "";

  if (i.domain === "unclear") {
    return `${h}Речь идёт о ${domainGenitive("unclear")}: ${mistakeOrSuccess}${tail}.`;
  }

  const z = domainGenitive(i.domain);
  return `${h}В зоне ${z}: ${mistakeOrSuccess}${tail}.`;
}

function meaningFor(i: ArenaObservationInterpretation): string {
  if (i.signalKind === "success") {
    return "Это хороший знак для развития: навык движется в сторону устойчивости. Это нормально на данном этапе — важно поддерживать регулярность и спокойный темп.";
  }
  if (i.signalKind === "mistake") {
    return "Промахи и нестабильность — обычная часть обучения; это нормально на данном этапе. Развитие идёт через повторение и аккуратную работу над деталями.";
  }
  return "Один фрагмент тренировки редко даёт полную картину; это нормально на данном этапе смотреть на динамику за несколько занятий.";
}

function attentionFor(input: BuildArenaParentExplanationInput): string | undefined {
  const cd = input.coachDecision;
  if (!cd) return undefined;
  const parts: string[] = [];
  if (cd.reviewPriority === "high") {
    parts.push("Тренер отметил этот момент как важный для проверки.");
  }
  if (cd.repeatedConcernInSession) {
    parts.push("Похожая тема появлялась несколько раз за эту тренировку.");
  }
  return parts.length > 0 ? parts.join(" ") : undefined;
}

export function buildArenaParentExplanation(input: BuildArenaParentExplanationInput): ArenaParentExplanation {
  const explanation = explanationFor(input.interpretation);
  const meaning = meaningFor(input.interpretation);
  const attention = attentionFor(input);
  return attention ? { explanation, meaning, attention } : { explanation, meaning };
}
