/**
 * Тонкий эмоциональный слой для родителя: без баллов, без преувеличений, без сравнений.
 */

import type { ParentPlayerDevelopmentSummaryDto } from "./parent-player-development-summary";
import type { ParentProgressNarrativeDto } from "./parent-progress-narrative";

export type ParentEmotionalInsightDto = {
  highlightMoment?: string;
  growthSignal?: string;
  encouragement?: string;
};

const MAX = 130;

function trimLine(s: string, max = MAX): string {
  const t = s.trim().replace(/\s+/gu, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function firstLine(raw: string | null | undefined, max = 120): string | undefined {
  if (!raw?.trim()) return undefined;
  const line = raw
    .split(/\r?\n/u)
    .map((x) => x.trim())
    .find((x) => x.length > 8);
  if (!line) return undefined;
  return trimLine(line, max);
}

function normPrefix(s: string, n = 72): string {
  return s.toLowerCase().replace(/\s+/gu, " ").slice(0, n);
}

/** Слишком пустые или «оценочные» клише — не поднимаем как «момент». */
function isPlausibleParentMoment(line: string): boolean {
  const t = line.toLowerCase();
  if (t.length < 14) return false;
  if (/^(спасибо|ок|хорошо|понятно|да|нет)[.!\s]*$/u.test(t)) return false;
  if (/\b(лучший|номер один|гений|талантливее всех)\b/u.test(t)) return false;
  return true;
}

function hasWeakData(
  report: { parentMessage?: string | null; summary?: string | null; focusAreas?: string | null } | null,
  dev: ParentPlayerDevelopmentSummaryDto
): boolean {
  const hasText =
    Boolean(report?.parentMessage?.trim()) ||
    Boolean(report?.summary?.trim()) ||
    Boolean(report?.focusAreas?.trim());
  return !hasText && dev.mainFocus.length === 0;
}

function hasConflict(dev: ParentPlayerDevelopmentSummaryDto): boolean {
  return Boolean(dev.positiveTrend?.trim() && dev.attentionArea?.trim());
}

/**
 * Собирает 0–3 короткие строки из уже родительских текстов (отчёт, сводка, нарратив).
 */
export function buildParentEmotionalInsight(input: {
  latestSessionReport: {
    parentMessage?: string | null;
    summary?: string | null;
    focusAreas?: string | null;
  } | null;
  parentDevelopmentSummary: ParentPlayerDevelopmentSummaryDto;
  parentProgressNarrative: ParentProgressNarrativeDto;
}): ParentEmotionalInsightDto {
  const report = input.latestSessionReport;
  const dev = input.parentDevelopmentSummary;
  const nar = input.parentProgressNarrative;

  let highlightMoment: string | undefined;
  const pm = firstLine(report?.parentMessage ?? null, 118);
  if (pm && isPlausibleParentMoment(pm)) {
    highlightMoment = `Слова тренера для вас: «${trimLine(pm, 110)}»`;
  } else {
    const fa = firstLine(report?.focusAreas ?? null, 100);
    if (fa && isPlausibleParentMoment(fa)) {
      highlightMoment = `В последнем отчёте в фокусе: ${sentenceSoft(fa)}`;
    }
  }

  let growthSignal: string | undefined;
  const trend = dev.positiveTrend?.trim();
  const att = dev.attentionArea?.trim();
  if (trend && !hasConflict(dev)) {
    growthSignal = trimLine(`По сводке слышно: ${sentenceSoft(trend)}`, MAX);
  } else if (dev.mainFocus[0]?.trim() && !highlightMoment) {
    growthSignal = trimLine(
      `Сейчас в формулировках чаще звучит: ${sentenceSoft(dev.mainFocus[0])}.`,
      MAX
    );
  } else if (nar.headline?.trim() && !highlightMoment && !growthSignal) {
    growthSignal = trimLine(
      `Контекст последних занятий можно описать так: ${sentenceSoft(nar.headline)} — это уже даёт опору, не цифру.`,
      MAX
    );
  }

  let encouragement: string | undefined;
  if (hasWeakData(report, dev)) {
    encouragement =
      "Когда появятся тексты после занятий, проще держать в голове общую линию — без спешки и без чужих «норм».";
  } else if (hasConflict(dev)) {
    encouragement =
      "Поддержка и мягкие акценты в записях могут идти рядом — это живая картина, а не «плохо/хорошо».";
  } else {
    encouragement =
      "Спокойный темп и понятные слова от тренеров — хорошая опора для вас и для ребёнка, без гонки за оценками.";
  }

  const nb = normPrefix(nar.body);
  if (highlightMoment && nb && normPrefix(highlightMoment).slice(0, 56) === nb.slice(0, 56)) {
    highlightMoment = undefined;
  }
  if (growthSignal && highlightMoment && normPrefix(growthSignal) === normPrefix(highlightMoment)) {
    growthSignal = undefined;
  }

  const out: ParentEmotionalInsightDto = {};
  if (highlightMoment) out.highlightMoment = highlightMoment;
  if (growthSignal) out.growthSignal = growthSignal;
  if (encouragement) out.encouragement = encouragement;

  return out;
}

function sentenceSoft(s: string): string {
  const t = s.trim();
  if (!t) return t;
  const c = t.charAt(0);
  const lc = c.toLocaleLowerCase("ru-RU");
  return lc === c ? t : lc + t.slice(1);
}
