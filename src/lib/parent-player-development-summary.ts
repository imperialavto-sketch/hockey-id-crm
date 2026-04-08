/**
 * Родительская сводка развития: человеческий язык, без внутренних терминов и «оценок».
 */

import type { PlayerDevelopmentInsightDto } from "./player-development-insights";

export type ParentPlayerDevelopmentSummaryDto = {
  mainFocus: string[];
  positiveTrend?: string;
  attentionArea?: string;
  simpleSummary: string;
};

const MAX_FOCUS = 3;
const MAX_LINE_LEN = 140;

const EMPTY_ENCOURAGEMENT =
  "Как только накопится больше записей после тренировок, здесь появится спокойная сводка — без сравнения с другими детьми и без баллов.";

function hasTechnicalWording(s: string): boolean {
  const t = s.toLowerCase();
  return (
    /\b(live|signal|domain|metric|api|dto)\b/u.test(t) ||
    /\bсигнал/u.test(t) ||
    /\bдомен/u.test(t) ||
    /метрик/u.test(t) ||
    /эвристик/u.test(t) ||
    /подтверждённ/u.test(t)
  );
}

function trimLine(s: string, max = MAX_LINE_LEN): string {
  const x = s.trim().replace(/\s+/gu, " ");
  if (x.length <= max) return x;
  return `${x.slice(0, max - 1)}…`;
}

function stripAttentionJargon(s: string): string {
  return s
    .replace(/^Повторные\s*[«"]внимание[»"]:\s*/iu, "")
    .replace(/^Недавний акцент\s*[«"]внимание[»"]:\s*/iu, "")
    .replace(/\s*—\s*$/u, "")
    .trim();
}

function softenForParentLine(s: string): string | null {
  const cleaned = stripAttentionJargon(s);
  if (!cleaned || hasTechnicalWording(cleaned)) return null;
  return trimLine(cleaned, 120);
}

function normKey(s: string): string {
  return s.toLowerCase().replace(/\s+/gu, " ").slice(0, 80);
}

function mergeFocusThemes(
  recurring: string[],
  recent: string[]
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of recurring) {
    const s = softenForParentLine(raw);
    if (!s) continue;
    const k = normKey(s);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= MAX_FOCUS) return out;
  }
  for (const raw of recent) {
    if (out.length >= MAX_FOCUS) break;
    const s = softenForParentLine(raw);
    if (!s) continue;
    const k = normKey(s);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function rewriteInternalSummaryLine(raw: string): string {
  let s = raw.trim();
  if (
    s.includes("Мало недавних сигналов для устойчивого паттерна") ||
    s.includes("картина может меняться от тренировки к тренировке")
  ) {
    return "Темы на тренировках могут меняться — это нормально, когда записей пока немного.";
  }
  if (s.includes("Пока мало данных в отчётах и сигналах")) {
    return "Пока мало записей после занятий — со временем здесь сложится более цельная картина.";
  }
  const liveRe =
    /^Live-сигналы:\s*плюс\s*(\d+)\s*,\s*внимание\s*(\d+)\s*,\s*нейтрально\s*(\d+)/iu;
  const m = s.match(liveRe);
  if (m) {
    const pos = Number(m[1]);
    const neg = Number(m[2]);
    const neu = Number(m[3]);
    if (Number.isFinite(pos) && Number.isFinite(neg) && Number.isFinite(neu)) {
      if (pos === 0 && neg === 0 && neu === 0) {
        return "По последним тренировкам пока нет заметок в этой сводке.";
      }
      if (neg === 0 && pos > 0) {
        return "В последних заметках после тренировок чаще звучат поддерживающие акценты.";
      }
      if (pos === 0 && neg > 0) {
        return "Тренеры отмечают несколько тем, на которых полезно мягко сфокусироваться.";
      }
      if (pos > neg * 1.25) {
        return "В свежих записях чаще встречаются позитивные акценты, есть и темы для спокойной работы.";
      }
      if (neg > pos * 1.05) {
        return "Картина разнообразная: есть и сильные стороны, и темы, где поддержка дома особенно уместна.";
      }
      return "По последним занятиям заметки сбалансированные — без резких выводов.";
    }
  }
  if (hasTechnicalWording(s)) {
    return "Краткая сводка по последним тренировкам — без сравнения с другими и без оценочных баллов.";
  }
  return trimLine(s, 220);
}

function buildSimpleSummary(insights: PlayerDevelopmentInsightDto): string {
  const hasBody =
    insights.recurringThemes.length > 0 ||
    insights.recentFocus.length > 0 ||
    insights.attentionSignals.length > 0;

  const soft =
    insights.confidence === "low"
      ? "Данных пока немного, формулировки намеренно осторожные. "
      : "";

  if (insights.summaryLine?.trim()) {
    return soft + rewriteInternalSummaryLine(insights.summaryLine);
  }

  if (!hasBody) {
    return soft + EMPTY_ENCOURAGEMENT;
  }

  if (insights.confidence === "low") {
    return (
      soft +
      "Ниже — несколько мягких ориентиров из отчётов тренеров; со временем картина станет яснее."
    );
  }

  return (
    soft +
    "Ниже — короткие ориентиры из записей после тренировок: на что обращают внимание тренеры и что можно поддержать дома спокойно."
  );
}

function buildPositiveTrend(insights: PlayerDevelopmentInsightDto): string | undefined {
  if (insights.momentum !== "up") return undefined;
  if (insights.confidence === "low") return undefined;
  if (insights.confidence === "high") {
    return "В последних отчётах прослеживается доброжелательная динамика — без спешки с выводами.";
  }
  return "По последним записям видно движение вперёд — хороший повод похвалить ребёнка за старание.";
}

function buildAttentionArea(insights: PlayerDevelopmentInsightDto): string | undefined {
  if (insights.attentionSignals.length === 0) return undefined;
  const first = insights.attentionSignals.map(stripAttentionJargon).find((x) => x.length > 0);
  if (!first || hasTechnicalWording(first)) return undefined;

  const line = trimLine(first, 100);
  if (insights.momentum === "mixed" && insights.confidence !== "high") {
    return `Тренеры мягко подсвечивают тему: «${line}» — это зона спокойной поддержки, не «замечание».`;
  }
  return `Тренеры просят чуть больше внимания к теме: «${line}» — можно поддержать дома без давления.`;
}

/**
 * Преобразует внутреннюю сводку тренера в текст для родителя (никаких внутренних полей в ответе).
 */
export function mapPlayerDevelopmentInsightsToParentSummary(
  insights: PlayerDevelopmentInsightDto
): ParentPlayerDevelopmentSummaryDto {
  const mainFocus = mergeFocusThemes(insights.recurringThemes, insights.recentFocus);

  const attentionArea = buildAttentionArea(insights);
  let positiveTrend = buildPositiveTrend(insights);
  if (positiveTrend && attentionArea && insights.confidence !== "high") {
    positiveTrend = undefined;
  }

  const simpleSummary = buildSimpleSummary(insights);

  return {
    mainFocus: mainFocus.slice(0, MAX_FOCUS),
    positiveTrend,
    attentionArea,
    simpleSummary,
  };
}
