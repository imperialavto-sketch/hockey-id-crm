/** Единый продуктовый copy для завершения голосового цикла (client-only). */

export const VOICE_LOOP_NEXT_SECTION_TITLE = "Дальше";

export const VOICE_LOOP_NEXT_SECTION_LEAD =
  "Новая заметка или раздел «Созданные материалы» — там сводка по тому, что вы уже вынесли из голоса в работу.";

/** Хаб /created: без привязки к конкретному источнику на сервере. */
export const VOICE_MATERIALS_HUB_EYEBROW = "Голос и материалы";

export const VOICE_MATERIALS_HUB_TITLE = "Созданные материалы";

export const VOICE_MATERIALS_HUB_SUB =
  "Сводка по отчётам, задачам, черновикам для родителей и истории голосовых заметок — удобно после тренировки или серии.";

/** Честная подсказка: свежие записи могут потребовать обновления. */
export const VOICE_MATERIALS_HUB_REFRESH_HINT =
  "Если только что сохранили отчёт или задачу из заметки, обновите хаб — списки подтягиваются с сервера.";

export const VOICE_NOTE_HUB_ENTRY_HINT =
  "Готовые из заметки отчёты и задачи попадают в сводку «Созданные материалы».";

export const VOICE_MATERIALS_ORCHESTRATION_KICKER = "Что уже в работе";

/** Единая формулировка про учёт локального разбора (preview + aiProcessed + completion). */
export const VOICE_AI_ACCOUNTED_LINE = "Разбор заметки учтён в подготовленном тексте.";

export const VOICE_AI_PILL_LABEL = "Разбор заметки учтён";

/** Блок превью на экране голосовой заметки (до starter). */
export const VOICE_PREVIEW_SECTION_EYEBROW = "Разбор заметки";

/** Когда starter в storage уже снят или id неверный. */
export const VOICE_STARTER_UNAVAILABLE_TITLE = "Черновик недоступен";

export const VOICE_STARTER_UNAVAILABLE_BODY =
  "Сессия устарела или черновик уже использован. Откройте сценарий снова из голосовой заметки.";

export function voiceServerSuccessHeadline(kind: "report" | "action"): string {
  return kind === "report" ? "Отчёт сохранён на сервере" : "Задача сохранена на сервере";
}

export function voiceServerSuccessLead(kind: "report" | "action"): string {
  return kind === "report"
    ? "Запись из голосовой заметки добавлена в отчёты. Цикл «заметка → черновик → сохранение» завершён."
    : "Задача из голосовой заметки добавлена в список. Цикл «заметка → заготовка → сохранение» завершён.";
}

/** Строки для блока «Итог»; только честные формулировки. */
export function voiceCompletionSummaryLines(opts: {
  kind: "report" | "action";
  hadAiBreakdown: boolean;
}): string[] {
  const lines: string[] = [];
  lines.push(
    opts.kind === "report"
      ? "Создано: запись отчёта на сервере."
      : "Создано: задача на сервере."
  );
  if (opts.hadAiBreakdown) {
    lines.push(VOICE_AI_ACCOUNTED_LINE);
  }
  return lines;
}

export const VOICE_LOOP_PARENT_DRAFT_DONE_TITLE = "Черновик сообщения готов";

export const VOICE_LOOP_PARENT_DRAFT_DONE_LEAD =
  "Текст подготовлен локально — отправка из приложения не выполняется. Скопируйте и отправьте удобным способом или вернитесь к правкам.";

export const VOICE_LOOP_ACTION_LOCAL_DONE_TITLE = "Заготовка задачи готова";

export const VOICE_LOOP_ACTION_LOCAL_DONE_LEAD =
  "Это локальный черновик из диалога — серверная задача не создана. Скопируйте текст или перейдите к голосовой заметке, чтобы оформить задачу на сервере.";
