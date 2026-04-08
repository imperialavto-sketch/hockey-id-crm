/**
 * Детерминированная rule-based интерпретация текста наблюдения (без LLM / скрытого AI).
 */

import type {
  ArenaInterpretationConfidence,
  ArenaInterpretationDirection,
  ArenaInterpretationDomain,
  ArenaInterpretationSignalKind,
  ArenaObservationInterpretation,
} from "./arenaInterpretationTypes";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function anyPhrase(t: string, phrases: readonly string[]): boolean {
  return phrases.some((p) => t.includes(p));
}

const SUCCESS_PHRASES = [
  "отлично",
  "молодец",
  "хорошо сработал",
  "хорошая",
  "хороший",
  "сильн",
  "классн",
  "супер",
  "здорово",
  "удачн",
  "точн",
  "четк",
  "great",
  "good job",
  "nice",
  "well done",
  "solid",
  "strong",
] as const;

const MISTAKE_PHRASES = [
  "ошиб",
  "плохо",
  "мимо",
  "упустил",
  "невнимательн",
  "зевнул",
  "не успел",
  "не дотянул",
  "слаб",
  "медленн",
  "mistake",
  "poor",
  "bad",
  "missed",
  "slow",
  "late",
] as const;

const POSITIVE_EXTRA = ["+", "плюс", "позитив", "positive"] as const;
const NEGATIVE_EXTRA = ["-", "минус", "негатив", "negative"] as const;

const TECHNICAL = [
  "шайб",
  "бросок",
  "броск",
  "передач",
  "прием",
  "клюшк",
  "катан",
  "коньк",
  "техник",
  "handling",
  "shot",
  "pass",
  "stick",
  "skating",
] as const;

const TACTICAL = [
  "позиц",
  "зон",
  "тактик",
  "чтение",
  "выбор",
  "coverage",
  "position",
  "lane",
  "read",
] as const;

const PHYSICAL = [
  "скорост",
  "сила",
  "мощн",
  "вынослив",
  "офп",
  "кондиц",
  "speed",
  "strength",
  "power",
  "conditioning",
  "endurance",
] as const;

const BEHAVIORAL = [
  "дисциплин",
  "поведен",
  "старани",
  "вовлечен",
  "настроен",
  "команд",
  "discipline",
  "behavior",
  "effort",
  "attitude",
] as const;

type DomainScores = Record<Exclude<ArenaInterpretationDomain, "unclear">, number>;

function pickDomain(scores: DomainScores): ArenaInterpretationDomain {
  const entries = Object.entries(scores) as [keyof DomainScores, number][];
  const max = Math.max(0, ...entries.map(([, v]) => v));
  if (max === 0) return "unclear";
  const winners = entries.filter(([, v]) => v === max);
  if (winners.length !== 1) return "unclear";
  return winners[0]![0];
}

export function interpretArenaObservation(text: string): ArenaObservationInterpretation {
  const t = norm(text);
  if (!t) {
    return {
      signalKind: "neutral_observation",
      domain: "unclear",
      direction: "neutral",
      confidence: "low",
      needsReview: true,
      rationale: "empty_text",
    };
  }

  const successHit = anyPhrase(t, SUCCESS_PHRASES);
  const mistakeHit = anyPhrase(t, MISTAKE_PHRASES);
  const posHit = anyPhrase(t, POSITIVE_EXTRA);
  const negHit = anyPhrase(t, NEGATIVE_EXTRA);

  if (successHit && mistakeHit) {
    return {
      signalKind: "neutral_observation",
      domain: "unclear",
      direction: "neutral",
      confidence: "low",
      needsReview: true,
      rationale: "conflicting_success_and_mistake_cues",
    };
  }

  let signalKind: ArenaInterpretationSignalKind = "neutral_observation";
  let direction: ArenaInterpretationDirection = "neutral";

  if (successHit || (posHit && !mistakeHit && !negHit)) {
    signalKind = "success";
    direction = "positive";
  } else if (mistakeHit || (negHit && !successHit && !posHit)) {
    signalKind = "mistake";
    direction = "negative";
  } else if (posHit && !negHit) {
    direction = "positive";
  } else if (negHit && !posHit) {
    direction = "negative";
  }

  const scores: DomainScores = {
    technical: 0,
    tactical: 0,
    physical: 0,
    behavioral: 0,
  };
  for (const p of TECHNICAL) if (t.includes(p)) scores.technical += 1;
  for (const p of TACTICAL) if (t.includes(p)) scores.tactical += 1;
  for (const p of PHYSICAL) if (t.includes(p)) scores.physical += 1;
  for (const p of BEHAVIORAL) if (t.includes(p)) scores.behavioral += 1;

  const domain = pickDomain(scores);

  let confidence: ArenaInterpretationConfidence = "medium";
  if (domain === "unclear") {
    confidence = "low";
  } else {
    const maxScore = Math.max(scores.technical, scores.tactical, scores.physical, scores.behavioral);
    if (maxScore >= 2) confidence = "high";
  }

  if (signalKind !== "neutral_observation" && domain !== "unclear" && confidence === "low") {
    confidence = "medium";
  }

  const needsReview = domain === "unclear" || confidence === "low";

  const rationaleParts: string[] = [];
  if (successHit) rationaleParts.push("success_cue");
  if (mistakeHit) rationaleParts.push("mistake_cue");
  if (domain !== "unclear") rationaleParts.push(`domain:${domain}`);

  return {
    signalKind,
    domain,
    direction,
    confidence,
    needsReview,
    ...(rationaleParts.length > 0 ? { rationale: rationaleParts.join(";") } : {}),
  };
}
