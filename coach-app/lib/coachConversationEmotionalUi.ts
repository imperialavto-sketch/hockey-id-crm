/**
 * Лёгкий эмоциональный слой чата (coach): тон, позитив — только эвристики, без API.
 */

import type { MessageUi } from "@/services/coachMessagesService";

/** Короткие coach-сообщения — кандидаты на мягкий тон. */
const COACH_TONE_MAX_LEN = 96;

/** Очень короткие — только эмодзи-маркер (если нет своих эмодзи в тексте). */
const COACH_TONE_EMOJI_MAX_LEN = 52;

const POSITIVE_RE =
  /молодец|отлично|супер|хорошо|хороший|прогресс|рад\b|горжусь|уверен|заметн|старался|большой шаг|молодцы|умница|браво|талант|классн|здорово|сильно вырос/i;

/** Без Unicode property escapes — совместимость RN. */
export function messageContainsEmoji(text: string): boolean {
  if (/👍|👌|🙂|😊|❤|🔥|⭐|✨|💪|🏒/.test(text)) return true;
  for (let i = 0; i < text.length; i++) {
    const c = text.codePointAt(i);
    if (c == null) continue;
    if (c >= 0x1f300 && c <= 0x1f9ff) return true;
    if (c >= 0x2600 && c <= 0x27bf) return true;
    if (c > 0xffff) i++;
  }
  return false;
}

export function isLikelyPositiveCoachMessage(msg: MessageUi): boolean {
  if (!msg.isOwn) return false;
  const t = msg.text.trim();
  if (t.length < 4) return false;
  return POSITIVE_RE.test(t);
}

/** Позитивный акцент карточки (чуть шире: короткое «спасибо», «ок»). */
export function isCoachCardPositiveHighlight(msg: MessageUi): boolean {
  if (!msg.isOwn) return false;
  if (isLikelyPositiveCoachMessage(msg)) return true;
  const t = msg.text.trim().toLowerCase();
  if (t.length > 120) return false;
  return (
    /спасибо|благодар|окей|ок\.|хорошего|удач|держим|так держать/i.test(t) ||
    (t.length <= 24 && /👍|👌/.test(msg.text))
  );
}

export type CoachToneCue = { kind: "emoji" | "phrase"; label: string };

/**
 * Мягкий маркер под текстом тренера — только короткие позитивные, без лишних эмодзи в тексте.
 */
export function buildCoachToneCue(msg: MessageUi): CoachToneCue | null {
  if (!msg.isOwn) return null;
  const t = msg.text.trim();
  if (!t || t.length > COACH_TONE_MAX_LEN) return null;
  if (!isLikelyPositiveCoachMessage(msg)) return null;
  if (messageContainsEmoji(msg.text)) return null;

  if (t.length <= COACH_TONE_EMOJI_MAX_LEN) {
    return { kind: "emoji", label: "👍" };
  }
  return { kind: "phrase", label: "Хорошо, есть прогресс" };
}

/** Входящее от родителя — мягкий зелёный акцент при тёплом тоне. */
export function isPositiveIncomingRegularMessage(msg: MessageUi, kind: "regular"): boolean {
  if (msg.isOwn || kind !== "regular") return false;
  const t = msg.text.trim();
  if (t.length < 3 || t.length > 200) return false;
  return POSITIVE_RE.test(t) || /спасибо|благодар|отлично|класс|супер|👍|👌/i.test(t);
}
