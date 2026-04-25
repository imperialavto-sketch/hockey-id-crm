/**
 * Единый coach-first слой коротких фраз Арены (TTS, UI-статус, уточнения, алерты).
 * Минимум текста, один тон, без лишней болтовни.
 */

// --- Brand / алерты ---

export const ARENA_ALERT_TITLE = "Арена";

export const ARENA_ALERT_SESSION_ALREADY_LIVE = "Тренировка уже идёт.";

export const ARENA_ALERT_DELETE_NOTHING =
  "Нечего удалять — нет последнего наблюдения.";

export const ARENA_ALERT_REASSIGN_NO_DRAFT = "Нет черновика для переназначения.";

export function ARENA_ALERT_PLAYER_NOT_FOUND(hint: string): string {
  return `Игрок не найден: «${hint}».`;
}

export const ARENA_ALERT_UNKNOWN_COMMAND = "Не поняла.";

export const ARENA_ALERT_EMPTY_TRANSCRIPT =
  "Пусто. Скажите «Арена» ещё раз.";

export const ARENA_ALERT_ACTION_CREATED_TITLE = "Готово";

export const ARENA_ALERT_ACTION_CREATED_BODY = "Задача в списке действий.";

export const ARENA_ALERT_COMMAND_FAILED_FALLBACK =
  "Не вышло. Попробуйте снова.";

// --- TTS: команды и результат ---

export const ARENA_TTS_SESSION_ALREADY_LIVE = "Уже идёт.";

export const ARENA_TTS_FINISH_FAILED = "Не вышло.";

export const ARENA_TTS_REFRESHED = "Обновила.";

/** Таймер live (UI pause), не путать с resume_session (refresh с сервера). */
export const ARENA_TTS_TIMER_PAUSED = "Пауза.";

export const ARENA_TTS_TIMER_RESUMED = "Продолжаю.";

export const ARENA_TTS_DELETE_NOTHING = "Нечего удалять.";

export const ARENA_TTS_DELETED_LAST = "Удалила.";

export const ARENA_TTS_REASSIGN_NO_DRAFT = "Нечего переназначить.";

export const ARENA_TTS_PLAYER_NOT_FOUND = "Игрок не найден.";

export function ARENA_TTS_REASSIGNED(firstName: string): string {
  return `${firstName}. Переназначила.`;
}

export const ARENA_TTS_QUEUED = "В очереди.";

export function ARENA_TTS_SAVED_PLAYER(firstName: string): string {
  return `${firstName}. Записала.`;
}

export const ARENA_TTS_SAVED_TEAM = "Пятёрка. Записала.";

export const ARENA_TTS_SAVED_SESSION = "Сессия. Записала.";

export const ARENA_TTS_LAST_EMPTY = "Пока пусто.";

export const ARENA_TTS_UNKNOWN = "Не поняла.";

export const ARENA_TTS_CLARIFY_GIVE_UP = "С «Арена».";

export const ARENA_TTS_CLARIFY_CANCELLED = "Отменила.";

export const ARENA_TTS_FINISH_TO_REVIEW = "Завершаю.";

/** In-session nudge (needs attention) — только короткий TTS */
export function ARENA_TTS_NUDGE_ATTENTION(playerLabel: string): string {
  return `${playerLabel}: внимание, минусы.`;
}

// --- Первичный разбор: запрос уточнения (парсер) ---

export const ARENA_CLARIFY_MEANING_DETAIL = "Скажите наблюдение целиком.";

export const ARENA_CLARIFY_PLAYER_AMBIGUOUS =
  "Несколько игроков подходят. Кто именно?";

export const ARENA_CLARIFY_PLAYER_CONTINUATION = "К какому игроку?";

export const ARENA_CLARIFY_TARGET_PICK = "Игрок или пятёрка?";

export const ARENA_CLARIFY_MEANING_SHORT = "Ещё раз — короче и яснее.";

// --- Follow-up после уточнения (resolver) ---

export const ARENA_RESOLVE_ROLE_NO_MATCH =
  "По роли не нашла. Скажите фамилию.";

export const ARENA_RESOLVE_NEED_SURNAME = "Нужна фамилия.";

export const ARENA_RESOLVE_SURNAME_OR_ROLE =
  "Фамилия или позиция: защитник, нападающий.";

export const ARENA_RESOLVE_NEED_PLAYER_NAME = "Имя или фамилия.";

export const ARENA_RESOLVE_TARGET_PICK_RETRY =
  "Пятёрка, сессия или игрок?";

export const ARENA_RESOLVE_MEANING_REPEAT_FULL = "Повторите фразу целиком.";

// --- TTS: уточнение после POST …/events (422 needs_clarification) — голосовой цикл ---

export function buildArenaTtsIngestClarifyTwo(aName: string, bName: string): string {
  const a = aName.trim().split(/\s+/).pop() ?? aName.trim();
  const b = bName.trim().split(/\s+/).pop() ?? bName.trim();
  return `Кого имели в виду? Скажите фамилию, номер на майке или первый — ${a}, второй — ${b} из списка.`;
}

export const ARENA_TTS_INGEST_CLARIFY_MANY =
  "Несколько подходят. Скажите фамилию, номер на майке или первый, второй из списка.";

export const ARENA_TTS_INGEST_CLARIFY_REPEAT =
  "Не разобрала. Фамилия, номер на майке или первый, второй из списка.";

export const ARENA_TTS_INGEST_CLARIFY_GIVE_UP = "Не записала. Повторите фразу позже.";

export const ARENA_TTS_INGEST_QUEUED = "Сохраню, когда появится сеть.";

export const ARENA_TTS_INGEST_RECORDED = "Записала.";

// --- UI статус рядом с микрофоном (live) ---

export const ARENA_UI_STATUS_IDLE = "Скажи «Арена» — потом фразу";

export const ARENA_UI_STATUS_LISTENING = "Слушаю";

export const ARENA_UI_STATUS_PROCESSING = "Разбираю";

export const ARENA_UI_CLARIFY_PLAYER = "Кто?";

export const ARENA_UI_CLARIFY_TARGET = "Игрок или пятёрка?";

export const ARENA_UI_CLARIFY_MEANING = "Ещё раз короче";

export const ARENA_UI_MIC_OFF_WEB =
  "В браузере wake word нет — ввод вручную.";

export const ARENA_UI_MIC_OFF_BUILD =
  "Распознавание недоступно — ввод вручную.";

export const ARENA_UI_ERROR_HINT = "Сеть / микрофон. Перезапуск сам.";

// --- Ошибки STT (хук) ---

export const ARENA_ERR_MIC_DENIED = "Нет доступа к микрофону";

export const ARENA_ERR_CLARIFY_START = "Не удалось начать уточнение";

export const ARENA_ERR_LISTEN_START = "Не удалось начать прослушивание";

export const ARENA_ERR_WAKE_START = "Не удалось запустить прослушивание wake word";

export const ARENA_ERR_RECOGNITION_GENERIC = "Ошибка распознавания";

// --- Статус «последняя запись» (TTS) ---

export const ARENA_LAST_TARGET_TEAM = "пятёрка";

export const ARENA_LAST_TARGET_SESSION = "сессия";

export const ARENA_LAST_NO_PLAYER = "без игрока";
