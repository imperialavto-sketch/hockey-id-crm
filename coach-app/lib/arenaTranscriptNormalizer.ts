/**
 * Нормализация STT-транскриптов для парсера «Арена» (MVP, без тяжёлого NLP).
 * Вызывается до wake strip и до разбора команд.
 */

const RE_EDGE_PUNCT = /^[\s.,;:!?«»"'()[\]{}—–\-…]+|[\s.,;:!?«»"'()[\]{}—–\-…]+$/g;

/** Убираем типичный «мусор» в начале фразы (одно слово + пауза). */
const RE_LEADING_FILLER = /^(ну|так|э|эм|мм|ээ|слушай|смотри)[,.\s]+/i;

/**
 * Полная нормализация для парсинга: регистр, ё, пробелы, лёгкая пунктуация,
 * очень консервативные правки под типичные STT-искажения.
 */
export function normalizeArenaTranscript(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.replace(/ё/g, "е");
  s = s.replace(/\u00a0/g, " ");
  s = s.replace(/\s+/g, " ");
  s = s.replace(RE_LEADING_FILLER, "");
  s = applyConservativeSttFixes(s);
  s = s.replace(RE_EDGE_PUNCT, "").replace(/\s+/g, " ").trim();
  return s;
}

/**
 * Только безопасные замены: не трогаем смысл длинных фраз, правим «арену» и пару хоккейных склеек.
 */
function applyConservativeSttFixes(s: string): string {
  let t = s;
  // Двойная «н» в wake
  t = t.replace(/аренна/g, "арена");
  // Разрыв в wake: «арен а» / «арен, а»
  t = t.replace(/(^|[\s.,;:!?«»"'()[\]{}—–-])арен[,.\s]+а(?=[\s.,;:!?«»"'()[\]{}—–-]|$)/gi, "$1арена");
  // Склейка STT: «аренамарк» → «арена марк» (≥3 букв подряд после wake)
  t = t.replace(/арена(?=[а-яё]{3,})/gi, "арена ");
  // «и еще» без ё (без \b — кириллица)
  t = t.replace(/(^|[\s.,;:!?])и\s+еще(?=[\s.,;:!?]|$)/gi, "$1и ещё");
  return t;
}

/**
 * Дополнительная нормализация только для поиска wake (после {@link normalizeArenaTranscript}).
 * Очень узкий набор «почти арена», чтобы не ловить чужие слова.
 */
export function normalizeForWakeMatch(s: string): string {
  let t = normalizeArenaTranscript(s);
  // Редкий перенос: «а рена»
  t = t.replace(/(^|[\s.,;:!?«»"'()[\]{}—–-])а\s+рена(?=[\s.,;:!?«»"'()[\]{}—–-]|$)/gi, "$1арена");
  // Очень редкая путаница первая гласная (только отдельным токеном)
  t = t.replace(/(^|[\s.,;:!?«»"'()[\]{}—–-])орена(?=[\s.,;:!?«»"'()[\]{}—–-]|$)/gi, "$1арена");
  return t;
}
