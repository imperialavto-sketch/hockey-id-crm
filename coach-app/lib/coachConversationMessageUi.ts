/**
 * UI-only heuristics for coach chat: context chips, “power” coach messages.
 * No API / server changes.
 */

import type { MessageUi } from "@/services/coachMessagesService";

export type ChatMessageKind = "coach" | "system" | "regular";

const POWER_KEYWORDS = [
  "обрати внимание",
  "важно",
  "критично",
  "обязательно",
].map((s) => s.toLowerCase());

const RECOMMEND_PATTERNS =
  /рекоменд|советую|обрати внимание|важно|ключевой момент/i;

const TRAINING_TEXT_RE =
  /тренировк|смена|арена|\blive\b|на льду|разминк|каток|ледов/i;

const TRAINING_AFTER_RE =
  /после тренировк|по итогам|закончили|итог смены|после смены/i;

const TRAINING_DURING_RE = /во время|на тренировке|во время смены|сейчас на (льду|смене)/i;

/** Достаточно длинное сообщение тренера — считаем “сильным”. */
const POWER_MIN_LEN = 140;

/** Короче, но с маркерами внимания — тоже сильное. */
const POWER_KEYWORD_EXTRA_MIN_LEN = 56;

export function threadMentionsTraining(messages: MessageUi[]): boolean {
  return messages.some((m) =>
    TRAINING_TEXT_RE.test(`${m.text} ${m.senderName}`.toLowerCase())
  );
}

export function extractPlayerFirstNameFromThreadTitle(title: string): string | null {
  const t = title.trim();
  if (!t) return null;
  const first = t.split(/\s+/)[0];
  return first || null;
}

export function isPowerCoachMessage(msg: MessageUi): boolean {
  if (!msg.isOwn) return false;
  const text = msg.text.trim();
  if (text.length >= POWER_MIN_LEN) return true;
  const lower = text.toLowerCase();
  if (
    text.length >= POWER_KEYWORD_EXTRA_MIN_LEN &&
    POWER_KEYWORDS.some((k) => lower.includes(k))
  ) {
    return true;
  }
  return false;
}

/**
 * Один компактный контекст над карточкой (coach/system).
 */
export function buildMessageContextHeader(params: {
  msg: MessageUi;
  kind: ChatMessageKind;
  playerLabel: string | null;
  /** есть ли в треде намёк на тренировку / смену / арену */
  threadHasTrainingHint: boolean;
  /** ms; если нет — эвристики по времени не используются */
  createdAtMs: number | undefined;
  nowMs?: number;
}): string | null {
  if (params.kind === "regular") return null;

  const now = params.nowMs ?? Date.now();
  const text = params.msg.text;
  const lower = text.toLowerCase();

  if (RECOMMEND_PATTERNS.test(text)) {
    return "Рекомендация";
  }

  if (TRAINING_DURING_RE.test(text)) {
    return "Во время тренировки";
  }
  if (TRAINING_AFTER_RE.test(text)) {
    return "После тренировки";
  }
  if (TRAINING_TEXT_RE.test(text)) {
    return "После тренировки";
  }

  const ageOk =
    typeof params.createdAtMs === "number" &&
    now - params.createdAtMs >= 0 &&
    now - params.createdAtMs < 4 * 60 * 60 * 1000;

  if (params.threadHasTrainingHint && ageOk) {
    return "После тренировки";
  }

  if (params.playerLabel) {
    return `По игроку: ${params.playerLabel}`;
  }

  return null;
}

/** Эвристики привязки к сущностям Hockey ID (без API). */
export type CoachSystemLinkFlags = {
  training: boolean;
  development: boolean;
  action: boolean;
};

const LINK_TRAINING_RE = /тренировк|смена/i;
const LINK_DEVELOPMENT_RE = /внимание|развитие/i;
const LINK_ACTION_RE = /сделай|нужно|рекоменд|важно|задач/i;

export function inferCoachSystemLinks(text: string): CoachSystemLinkFlags {
  const t = text.toLowerCase();
  return {
    training: LINK_TRAINING_RE.test(t),
    development: LINK_DEVELOPMENT_RE.test(t),
    action: LINK_ACTION_RE.test(t),
  };
}

export function coachSystemLinksAny(links: CoachSystemLinkFlags): boolean {
  return links.training || links.development || links.action;
}

/**
 * Строка под player strip: контекст всего треда.
 */
export function buildThreadContextBanner(params: {
  messages: MessageUi[];
  threadHasTrainingHint: boolean;
}): string | null {
  const blob = params.messages.map((m) => `${m.text} ${m.senderName}`).join(" ");
  const lower = blob.toLowerCase();

  const afterTrainingThread =
    /после тренировк|по итогам|итог смены|после смены|закончили тренировк/i.test(
      blob
    );

  if (params.threadHasTrainingHint || afterTrainingThread) {
    return "Последний контакт: после тренировки";
  }

  if (LINK_DEVELOPMENT_RE.test(lower)) {
    return "Обсуждение: развитие игрока";
  }

  return null;
}
