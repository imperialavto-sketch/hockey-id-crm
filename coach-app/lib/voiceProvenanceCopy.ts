/**
 * Единый текст для Phase 2: связь материалов с голосовой заметкой (server-backed voiceNoteId).
 */

export const VOICE_PROVENANCE = {
  /** Короткая метка в списках / хабе (pill). */
  PILL_LABEL: "Из заметки",
  /** Строка подробного описания на детальных экранах и для a11y pill. */
  DETAIL_DESCRIPTION: "Создано из голосовой заметки",
  /** Кикер блока provenance на детали. */
  DETAIL_KICKER: "Источник",
  /** Кнопка перехода к заметке. */
  OPEN_NOTE_CTA: "Открыть заметку",
} as const;

/** Честная проверка server-backed ссылки: не полагаемся на truthy для пробелов. */
export function hasVoiceNoteLink(voiceNoteId: string | null | undefined): boolean {
  return typeof voiceNoteId === "string" && voiceNoteId.trim().length > 0;
}

/** Standalone parent draft: session_draft не получает voiceNoteId с сервера. */
export function hasParentDraftVoiceNoteLink(
  source: "parent_draft" | "session_draft" | null | undefined,
  voiceNoteId: string | null | undefined
): boolean {
  return source === "parent_draft" && hasVoiceNoteLink(voiceNoteId);
}
