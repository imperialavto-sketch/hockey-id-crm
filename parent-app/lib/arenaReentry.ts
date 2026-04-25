import type { ArenaContinuitySnapshot } from "@/types/arenaContinuity";

export type ArenaReentry = {
  title: string;
  text: string;
  ctaLabel: string;
  ctaPrompt: string;
  isVisible: boolean;
};

const REENTRY_MAX_AGE_DAYS = 4;
const MS_DAY = 86_400_000;

function clip(value: string, maxLen: number): string {
  const t = value.trim().replace(/\s+/g, " ");
  if (!t) return "";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
}

function ageDays(updatedAt: string): number {
  const ts = new Date(updatedAt).getTime();
  if (!Number.isFinite(ts)) return REENTRY_MAX_AGE_DAYS + 1;
  return (Date.now() - ts) / MS_DAY;
}

function promptFromIntent(intent: string): string {
  const low = intent.toLowerCase();
  if (/дом|упраж|минут/.test(low)) {
    return "Напомни, как лучше заниматься дома сейчас: один короткий шаг на ближайшие дни.";
  }
  if (/трениров|разбор|оценк/.test(low)) {
    return "Давай продолжим разбор последней тренировки. Что сейчас следующий шаг?";
  }
  if (/игр|матч/.test(low)) {
    return "Продолжим тему игры: на чем лучше сфокусироваться перед ближайшим матчем?";
  }
  if (/прогресс|динамик/.test(low)) {
    return "Продолжим оценку динамики: что сейчас считать главным признаком прогресса?";
  }
  return "Продолжим с прошлого раза. Что сейчас важнее всего в ближайшем шаге?";
}

export function deriveArenaReentry(
  snapshot: ArenaContinuitySnapshot | null | undefined
): ArenaReentry {
  const hidden: ArenaReentry = {
    title: "",
    text: "",
    ctaLabel: "",
    ctaPrompt: "",
    isVisible: false,
  };
  if (!snapshot) return hidden;
  if (ageDays(snapshot.updatedAt) > REENTRY_MAX_AGE_DAYS) return hidden;

  const focus = clip(snapshot.lastInsight?.focus ?? "", 72);
  const intent = clip(snapshot.lastUserIntent ?? "", 56);
  const advice = clip(snapshot.lastAdvice ?? "", 88);
  const text = focus || intent || advice;
  if (!text) return hidden;

  if (focus) {
    return {
      title: "С прошлого раза",
      text: `Фокус был на: ${focus}`,
      ctaLabel: "Продолжить",
      ctaPrompt: `Давай продолжим тему «${focus}». Что сейчас следующий шаг?`,
      isVisible: true,
    };
  }

  if (intent) {
    return {
      title: "Продолжим",
      text: `Вы смотрели на тему: ${intent}`,
      ctaLabel: "Что дальше",
      ctaPrompt: promptFromIntent(intent),
      isVisible: true,
    };
  }

  return {
    title: "С прошлого раза",
    text: advice,
    ctaLabel: "Продолжить",
    ctaPrompt: "Продолжим с прошлого раза. Какой следующий практический шаг лучше сделать сейчас?",
    isVisible: true,
  };
}
