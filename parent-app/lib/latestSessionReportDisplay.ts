import type { LatestSessionReport } from "@/services/playerService";

function normalizeHeroText(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Главный текст hero «Последняя тренировка» для родителя:
 * parentMessage → summary → первая строка фокуса (только канонический отчёт, без coachNote).
 */
export function pickLastTrainingHeroPrimaryText(
  report: LatestSessionReport | null
): string {
  if (!report) return "";
  const p = report.parentMessage?.trim();
  if (p) return p;
  const s = report.summary?.trim();
  if (s) return s;
  const fa = report.focusAreas?.trim();
  if (fa) {
    const first = fa.split(/\r?\n/u).map((x) => x.trim()).find(Boolean);
    if (first) return first;
  }
  return "";
}

/**
 * Если основной текст уже parentMessage, а summary есть и не дублирует его —
 * можно показать summary второй строкой (спокойный контекст «о тренировке»).
 */
export function pickLastTrainingHeroSupportingSummary(
  report: LatestSessionReport | null
): string | null {
  if (!report) return null;
  const pm = report.parentMessage?.trim();
  const sum = report.summary?.trim();
  if (!pm || !sum) return null;
  if (normalizeHeroText(pm) === normalizeHeroText(sum)) return null;
  return sum;
}

export function formatReportContextDate(
  iso: string | null | undefined
): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function pickFocusAreasLine(report: LatestSessionReport | null): string {
  return report?.focusAreas?.trim() ?? "";
}

export function hasLastTrainingHeroContent(
  report: LatestSessionReport | null
): boolean {
  return Boolean(
    pickLastTrainingHeroPrimaryText(report) || pickFocusAreasLine(report)
  );
}

/** «На основе N тренировок» с корректным склонением. */
export function formatProgressBasedOnTrainings(n: number): string {
  const abs = Math.abs(Math.floor(n));
  const n100 = abs % 100;
  const n10 = abs % 10;
  let word: string;
  if (n100 >= 11 && n100 <= 14) {
    word = "тренировок";
  } else if (n10 === 1) {
    word = "тренировка";
  } else if (n10 >= 2 && n10 <= 4) {
    word = "тренировки";
  } else {
    word = "тренировок";
  }
  return `На основе ${abs} ${word}`;
}
