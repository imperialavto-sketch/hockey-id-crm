/**
 * Лёгкая связь «родитель ↔ линия тренера» без чата, без обязанности отвечать.
 *
 * BOUNDARY: экспортируемые builders не импортируются текущими parent routes в `src/app/api/**`;
 * не считать частью активного parent HTTP runtime surface.
 */

import type { ParentEmotionalInsightDto } from "./parent-emotional-insight";
import type { ParentProgressNarrativeDto } from "./parent-progress-narrative";

export type ParentConnectionCueDto = {
  optionalReflection?: string;
  optionalQuestion?: string;
};

const MAX = 140;

function trimLine(s: string, max = MAX): string {
  const t = s.trim().replace(/\s+/gu, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function firstLine(raw: string | null | undefined, max = 100): string | undefined {
  if (!raw?.trim()) return undefined;
  const line = raw
    .split(/\r?\n/u)
    .map((x) => x.trim())
    .find((x) => x.length > 6);
  if (!line) return undefined;
  return trimLine(line, max);
}

function secondLine(raw: string | null | undefined, max = 90): string | undefined {
  if (!raw?.trim()) return undefined;
  const lines = raw
    .split(/\r?\n/u)
    .map((x) => x.trim())
    .filter((x) => x.length > 6);
  if (lines.length < 2) return undefined;
  return trimLine(lines[1]!, max);
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/gu, " ").slice(0, 96);
}

function overlapsMuch(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (na.length < 18 || nb.length < 18) return false;
  if (na.slice(0, 44) === nb.slice(0, 44)) return true;
  return na.includes(nb.slice(0, 36)) || nb.includes(na.slice(0, 36));
}

function emotionalLines(em: ParentEmotionalInsightDto): string[] {
  return [em.highlightMoment, em.growthSignal, em.encouragement].filter(
    (x): x is string => Boolean(x?.trim())
  );
}

function distinctFrom(
  candidate: string,
  emotional: ParentEmotionalInsightDto,
  narrativeBody: string,
  narrativeExtras: string[]
): boolean {
  for (const e of emotionalLines(emotional)) {
    if (overlapsMuch(candidate, e)) return false;
  }
  if (overlapsMuch(candidate, narrativeBody)) return false;
  for (const x of narrativeExtras) {
    if (x && overlapsMuch(candidate, x)) return false;
  }
  return true;
}

function hasReportText(
  r: { parentMessage?: string | null; summary?: string | null; focusAreas?: string | null } | null
): boolean {
  if (!r) return false;
  return Boolean(
    r.parentMessage?.trim() || r.summary?.trim() || r.focusAreas?.trim()
  );
}

function isSparseNarrativeBody(body: string): boolean {
  const b = body.trim();
  return (
    /^Пока в приложении мало/iu.test(b) ||
    /^Здесь будет короткая история/iu.test(b)
  );
}

/**
 * Мягкие подсказки «как быть рядом с линией тренера» — опционально, без давления.
 */
export function buildParentConnectionCue(input: {
  latestSessionReport: {
    parentMessage?: string | null;
    summary?: string | null;
    focusAreas?: string | null;
  } | null;
  parentEmotionalInsight: ParentEmotionalInsightDto;
  parentProgressNarrative: ParentProgressNarrativeDto;
}): ParentConnectionCueDto | null {
  const report = input.latestSessionReport;
  const em = input.parentEmotionalInsight;
  const nar = input.parentProgressNarrative;
  const body = nar.body?.trim() ?? "";
  const continuing = nar.continuingFocus?.trim() ?? "";
  const stabilizing = nar.stabilizingArea?.trim() ?? "";
  const extras = [continuing, stabilizing].filter(Boolean);

  if (!hasReportText(report) && isSparseNarrativeBody(body)) {
    return null;
  }

  const pm = report?.parentMessage ?? null;
  const fa = firstLine(report?.focusAreas ?? null, 88);
  const su = firstLine(report?.summary ?? null, 88);
  const pm2 = secondLine(pm, 80);
  const pm1 = firstLine(pm, 72);
  let snippet =
    fa ??
    su ??
    pm2 ??
    (pm1 && pm1.length >= 14 ? pm1 : undefined) ??
    (continuing.length >= 24 ? trimLine(continuing, 72) : undefined) ??
    (stabilizing.length >= 24 ? trimLine(stabilizing, 72) : undefined);

  if (snippet && pm1 && norm(snippet) === norm(pm1)) {
    snippet = pm2 ?? snippet;
  }

  const salt = (snippet?.length ?? 0) + (body.length % 7);
  const weak = !fa && !su && !pm2 && (!pm1 || pm1.length < 14) && !continuing && !stabilizing;

  let optionalReflection: string | undefined;
  let optionalQuestion: string | undefined;

  if (snippet) {
    const s = trimLine(snippet.replace(/^«|»$/gu, ""), 72);
    const r0 = trimLine(
      `Дома можно мягко обратить внимание на ${s} — для вас, без ожидания ответа от тренера.`,
      MAX
    );
    const r1 = trimLine(
      `Иногда помогает спокойно проговорить то, с чем работали на занятии: ${s}. Отчёт тренеру не нужен.`,
      MAX
    );
    optionalReflection = salt % 2 === 0 ? r0 : r1;
  } else if (hasReportText(report) || !isSparseNarrativeBody(body)) {
    optionalReflection = trimLine(
      "Даже нейтральное «как прошла тренировка?» без оценки — уже связь с тем, что пишут тренеры; писать им не обязательно.",
      MAX
    );
  }

  if (optionalReflection && !distinctFrom(optionalReflection, em, body, extras)) {
    optionalReflection = trimLine(
      "Рядом с ребёнком можно держать в голове общую линию из записей — без контроля и без обязанности отвечать тренеру.",
      MAX
    );
    if (!distinctFrom(optionalReflection, em, body, extras)) {
      optionalReflection = undefined;
    }
  }

  if (!weak && (snippet || pm1)) {
    const q0 = trimLine(
      "Можно понаблюдать, как это проявляется в обычной неделе — только для себя, не для чата с тренером.",
      MAX
    );
    const q1 = trimLine(
      "Обратите внимание, как ребёнок сам возвращается к теме занятия — просто заметить, без необходимости писать.",
      MAX
    );
    optionalQuestion = salt % 2 === 0 ? q1 : q0;
  }

  if (
    optionalQuestion &&
    optionalReflection &&
    overlapsMuch(optionalQuestion, optionalReflection)
  ) {
    optionalQuestion = undefined;
  }

  if (
    optionalQuestion &&
    !distinctFrom(optionalQuestion, em, body, extras)
  ) {
    optionalQuestion = undefined;
  }

  if (!optionalReflection && !optionalQuestion) {
    return null;
  }

  const out: ParentConnectionCueDto = {};
  if (optionalReflection) out.optionalReflection = optionalReflection;
  if (optionalQuestion) out.optionalQuestion = optionalQuestion;
  return out;
}
