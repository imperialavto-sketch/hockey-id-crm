/**
 * Короткая «история прогресса» для родителя — только родительские отчёты и сводка развития.
 *
 * BOUNDARY: экспортируемые builders не импортируются текущими parent routes в `src/app/api/**`;
 * не считать частью активного parent HTTP runtime surface.
 */

import type { ParentFacingSessionReport } from "./parent-players";
import type { ParentPlayerDevelopmentSummaryDto } from "./parent-player-development-summary";

export type ParentProgressNarrativeDto = {
  headline?: string;
  body: string;
  continuingFocus?: string;
  stabilizingArea?: string;
};

function firstLine(raw: string | null | undefined, max = 140): string | undefined {
  if (!raw?.trim()) return undefined;
  const line = raw
    .split(/\r?\n/u)
    .map((x) => x.trim())
    .find((x) => x.length > 4);
  if (!line) return undefined;
  const t = line.replace(/\s+/gu, " ");
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function sentenceCase(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Грубое пересечение тем между двумя текстами (без «аналитики», только повтор слов). */
function sharedThemeHint(a: string | null | undefined, b: string | null | undefined): string | null {
  const la = (a ?? "").toLowerCase().replace(/[^\p{L}\d\s]/gu, " ");
  const lb = (b ?? "").toLowerCase().replace(/[^\p{L}\d\s]/gu, " ");
  const words = la.split(/\s+/).filter((w) => w.length >= 5);
  for (const w of words) {
    if (lb.includes(w)) return w;
  }
  return null;
}

function combineReportText(r: ParentFacingSessionReport): string {
  return [r.parentMessage, r.focusAreas, r.summary].filter(Boolean).join(" ");
}

function isLowDataDev(dev: ParentPlayerDevelopmentSummaryDto): boolean {
  return (
    dev.mainFocus.length === 0 &&
    !dev.positiveTrend?.trim() &&
    !dev.attentionArea?.trim()
  );
}

function softSummaryHint(dev: ParentPlayerDevelopmentSummaryDto): boolean {
  const s = dev.simpleSummary?.trim() ?? "";
  return (
    /пока мало|немного|осторожн|накопится|со временем|как только/iu.test(s) &&
    dev.mainFocus.length === 0
  );
}

/**
 * Собирает 2–4 спокойных предложения и опциональные строки «продолжение / стабильность».
 */
export function buildParentProgressNarrative(input: {
  parentDevelopmentSummary: ParentPlayerDevelopmentSummaryDto;
  latestSessionReport: ParentFacingSessionReport | null;
  recentPublishedReports: ParentFacingSessionReport[];
}): ParentProgressNarrativeDto {
  const dev = input.parentDevelopmentSummary;
  const recent = input.recentPublishedReports;
  const n = recent.length;
  const latest = input.latestSessionReport ?? recent[0] ?? null;

  const pm = firstLine(latest?.parentMessage ?? null, 120);
  const fa = firstLine(latest?.focusAreas ?? null, 120);
  const su = firstLine(latest?.summary ?? null, 120);
  const mf0 = dev.mainFocus[0]?.trim();
  const mf1 = dev.mainFocus[1]?.trim();
  const trend = dev.positiveTrend?.trim();
  const attention = dev.attentionArea?.trim();
  const lowDev = isLowDataDev(dev);
  const softDev = softSummaryHint(dev);
  const conflict = Boolean(trend && attention);

  const sentences: string[] = [];
  let headline: string | undefined;
  let continuingFocus: string | undefined;
  let stabilizingArea: string | undefined;

  if (n === 0 && lowDev) {
    headline = undefined;
    sentences.push(
      "Пока в приложении мало связанных записей после тренировок — так бывает в начале пути."
    );
    sentences.push(
      "Как только тренеры начнут фиксировать итоги занятий, здесь сложится более цельная история без спешки и оценочных баллов."
    );
    return { body: sentences.join(" "), headline, continuingFocus, stabilizingArea };
  }

  if (n === 1 && latest) {
    headline = "Свежая страница после занятия";
    if (pm) {
      sentences.push(`В последней записи тренер оставил акцент: ${sentenceCase(pm)}`);
    } else if (fa) {
      sentences.push(`В фокусе последней тренировки: ${sentenceCase(fa)}`);
    } else if (su) {
      sentences.push(`Кратко о последнем занятии: ${sentenceCase(su)}`);
    } else if (mf0) {
      sentences.push(`По сводке сейчас заметен такой ориентир: ${sentenceCase(mf0)}`);
    } else {
      sentences.push("Есть одна свежая запись после тренировки — ниже можно прочитать её спокойно, без сравнения с другими детьми.");
    }
    sentences.push(
      "Со временем, когда появятся ещё записи, картина станет более связной — это нормальный темп."
    );
    if (softDev) {
      sentences.push(
        "Пока данных немного, формулировки намеренно осторожные — мы не придумываем драму там, где её нет."
      );
    }
  } else if (n >= 2) {
    headline = "Несколько шагов подряд";
    const t0 = combineReportText(recent[0]);
    const t1 = combineReportText(recent[1]);
    const shared = sharedThemeHint(t0, t1);

    if (pm || fa || su) {
      const anchor = pm ?? fa ?? su!;
      sentences.push(
        `В последних занятиях тренеры опираются на такой акцент: ${sentenceCase(anchor)}`
      );
    } else if (mf0) {
      sentences.push(`В сводке по нескольким тренировкам просматривается ориентир: ${sentenceCase(mf0)}`);
    } else {
      sentences.push(
        `Уже есть ${n} записей после занятий — это помогает видеть движение не как один разовый снимок, а как короткую историю.`
      );
    }

    if (shared && !mf0) {
      continuingFocus = `Тема «${shared}» встречается в более чем одной записи — это может быть нитью, к которой тренеры возвращаются.`;
    } else if (mf0) {
      continuingFocus = `Похоже, в фокусе остаётся: ${sentenceCase(mf0)}${mf1 ? `; рядом звучит и ${sentenceCase(mf1)}` : ""}.`;
      if (continuingFocus.length > 200) {
        continuingFocus = `Похоже, в фокусе остаётся: ${sentenceCase(mf0)}.`;
      }
    } else if (!shared) {
      sentences.push(
        "Темы в записях могут меняться от занятия к занятию — это не сигнал «всё сбилось», а живой процесс."
      );
    }

    if (conflict) {
      sentences.push(
        "В текстах есть и поддерживающие акценты, и мягкие зоны внимания — оба типа сообщений уместны и дополняют друг друга."
      );
    } else if (trend) {
      stabilizingArea = trimStabilizing(trend);
    } else if (attention && !trend) {
      sentences.push(
        "Сейчас тренеры чаще подсвечивают пару тем для спокойной поддержки дома — без давления и без оценки «хорошо/плохо»."
      );
    }

    if (softDev && sentences.length < 4) {
      sentences.push(
        "Пока история короткая, мы сознательно не раздуваем выводы — лучше дождаться ещё пары спокойных записей."
      );
    }
  } else {
    // n===0 но dev не пустой
    headline = undefined;
    sentences.push(
      dev.simpleSummary?.trim() ||
        "Когда появятся тексты после тренировок, здесь будет короткая связная история — в том же спокойном тоне, что и остальные блоки."
    );
    if (mf0) {
      continuingFocus = `Уже сейчас в сводке звучит ориентир: ${sentenceCase(mf0)}.`;
    }
  }

  let body = sentences
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(" ");

  if (!body.trim()) {
    body =
      "Здесь будет короткая история развития по записям тренеров — спокойно, без баллов и без сравнения с другими детьми.";
  }

  if (body.length > 620) {
    body = `${body.slice(0, 617)}…`;
  }

  if (stabilizingArea && conflict) {
    stabilizingArea = undefined;
  }

  return {
    headline,
    body,
    continuingFocus,
    stabilizingArea,
  };
}

function trimStabilizing(trend: string): string {
  const t = trend.replace(/\s+/gu, " ").trim();
  if (t.length <= 140) return t;
  return `${t.slice(0, 137)}…`;
}
