/**
 * Мягкая «осознанность» по микро-ориентирам старта vs текст черновиков на review.
 * Эвристика, без оценки качества и без претензии на полноту.
 */

import type { LiveMicroGuidanceDto } from "@/lib/liveTrainingMicroGuidance";
import type { LiveTrainingObservationDraft } from "@/types/liveTraining";

export type LiveGuidanceAwarenessStatus = "seen" | "not_seen" | "uncertain";

export type LiveGuidanceAwarenessDto = {
  cues: Array<{
    title: string;
    status: LiveGuidanceAwarenessStatus;
  }>;
};

function normBlob(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, " ");
}

/** Нормализация для поиска подстроки (без лишних пробелов). */
function normCompact(s: string): string {
  return normBlob(s).replace(/ /gu, "");
}

function tokensForMatch(text: string): string[] {
  const t = normBlob(text);
  return t
    .split(/[^a-zа-яё0-9]+/iu)
    .map((x) => x.trim())
    .filter((x) => x.length >= 4);
}

/** Убираем служебные префиксы и хвост «— в фокусе и в закреплении». */
function cueCoreForMatch(cueTitle: string): string {
  let t = normBlob(cueTitle);
  t = t.replace(/^сверить:\s*/u, "").replace(/^проверить по отчёту:\s*/u, "");
  const dash = t.indexOf(" — ");
  if (dash > 0) t = t.slice(0, dash).trim();
  return t.trim();
}

function matchCueToObservations(cueTitle: string, obsNorm: string, obsCompact: string): LiveGuidanceAwarenessStatus {
  const core = cueCoreForMatch(cueTitle);
  const full = normBlob(cueTitle);

  if (full.length >= 10 && obsNorm.includes(full)) return "seen";
  if (core.length >= 8 && obsNorm.includes(core)) return "seen";
  if (core.length >= 6 && obsCompact.includes(normCompact(core))) return "seen";

  const tok = tokensForMatch(core || cueTitle);
  if (tok.length === 0) return "uncertain";

  const hits = tok.filter((w) => obsNorm.includes(w));
  if (hits.length >= 2) return "seen";
  if (hits.length === 1 && hits[0].length >= 6) return "seen";
  if (hits.length === 1) return "uncertain";
  return "not_seen";
}

/**
 * Сопоставляет микро-ориентиры live с текстами черновиков (sourceText).
 * null — нет ориентиров для сравнения.
 */
export function buildLiveGuidanceAwareness(
  micro: LiveMicroGuidanceDto | null,
  drafts: LiveTrainingObservationDraft[]
): LiveGuidanceAwarenessDto | null {
  if (!micro?.cues?.length) return null;

  const parts: string[] = [];
  for (const d of drafts) {
    const t = d.sourceText?.trim();
    if (t) parts.push(t);
  }
  const obsNorm = normBlob(parts.join("\n"));
  const obsCompact = normCompact(parts.join(" "));

  const totalChars = parts.join("").length;
  const fewObservations = drafts.length === 0 || totalChars < 24;

  const cues = micro.cues.map((c) => {
    if (fewObservations) {
      return { title: c.title, status: "uncertain" as const };
    }
    return {
      title: c.title,
      status: matchCueToObservations(c.title, obsNorm, obsCompact),
    };
  });

  return { cues };
}

export const LIVE_GUIDANCE_AWARENESS_COPY = {
  sectionTitle: "Что проявилось в наблюдениях",
  sectionSub:
    "Грубое сопоставление ориентиров старта с текстом черновиков — без оценки «сделали / не сделали» и без учёта смысла на 100%.",
  seen: "Похоже, это прозвучало в наблюдениях",
  uncertain: "Связь неочевидна — можно сверить с формулировками ниже",
  notSeen: "Явного пересечения с текстом наблюдений не видно — это нормально",
} as const;
