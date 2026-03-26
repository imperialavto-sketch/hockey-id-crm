/**
 * Shared copy + formatting for coach materials (hub + detail). No business logic.
 */

import { PARENT_FLAGSHIP } from "./parentFlagshipShared";

export const CM_VOICE_LABEL = "Из заметки";

/** Detail / full cards — long date with time. */
export function formatCoachMaterialDateDetail(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.trim();
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Hub list rows — compact. */
export function formatCoachMaterialDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.trim();
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDueDateOnly(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.trim();
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatActionItemStatusLabel(status: string): string {
  const s = status.trim().toLowerCase();
  if (["pending", "open", "todo"].includes(s)) return "К выполнению";
  if (["done", "completed"].includes(s)) return "Выполнено";
  if (["cancelled", "canceled"].includes(s)) return "Отменено";
  if (!s) return "Статус не указан";
  return "Статус не указан";
}

export function formatParentDraftStatusLabel(status: string | null): string {
  if (status == null || !String(status).trim()) {
    return "Черновик";
  }
  const s = String(status).trim().toLowerCase();
  if (["draft", "pending"].includes(s)) return "Черновик";
  if (["ready", "prepared"].includes(s)) return "Готово";
  if (s === "sent") return "Отправлено";
  if (["cancelled", "canceled", "archived"].includes(s)) return "Неактивно";
  return "Статус не указан";
}

export const CM_COPY = {
  hubIntro:
    "Все отчёты, задачи и черновики сообщений от тренера после занятий — в одном месте. Откройте карточку, чтобы прочитать полностью.",
  hubEmptyLive:
    "Пока нет сохранённых материалов. После тренировок они появятся здесь автоматически.",
  hubEmptyDemo: "В демо-режиме материалы тренера не загружаются.",
  /** Hub list fetch — primary line + shared retry hint (matches inbox / profile). */
  fetchErrorHub: `Не удалось загрузить материалы. ${PARENT_FLAGSHIP.networkRetrySubtitle}`,
  fetchErrorReport: `Не удалось загрузить отчёт. ${PARENT_FLAGSHIP.networkRetrySubtitle}`,
  fetchErrorAction: `Не удалось загрузить задачу. ${PARENT_FLAGSHIP.networkRetrySubtitle}`,
  fetchErrorDraft: `Не удалось загрузить сообщение. ${PARENT_FLAGSHIP.networkRetrySubtitle}`,
  authRequired:
    "Войдите в аккаунт, чтобы загрузить материалы тренера.",
  notFoundReport: "Отчёт не найден или нет доступа.",
  notFoundAction: "Задача не найдена или нет доступа.",
  notFoundDraft: "Сообщение не найдено или нет доступа.",
  invalidPlayer: "Не удалось определить игрока.",

  reportTitleFallback: "Отчёт тренера",
  actionTitleFallback: "Задача",
  draftTitleFallback: "Черновик сообщения",

  reportSubtitle: "Отчёт после тренировки",
  actionSubtitle: "Задача от тренера",
  draftSubtitle: "Сообщение для родителя",

  reportBodyEmpty: "Текст отчёта пока пустой — загляните позже или уточните в чате с тренером.",
  actionBodyEmpty:
    "Описание от тренера пока не добавлено — уточните детали в чате с тренером.",
  draftBodyEmpty:
    "Текст пока пустой — загляните позже или напишите тренеру в чате.",

  demoReport: "В демо-режиме этот материал недоступен.",
  demoAction: "В демо-режиме этот материал недоступен.",
  demoDraft: "В демо-режиме этот материал недоступен.",

  sectionText: "Текст",
  sectionDescription: "Описание",

  draftKindLine: "Черновик сообщения тренера для вас — не отчёт и не задача.",

  hubReportPreviewEmpty: "Откройте карточку, чтобы прочитать полностью.",
  hubActionPreviewEmpty: "Описание откроется на экране задачи.",
  hubDraftPreviewEmpty: "Текст откроется на экране сообщения.",
} as const;

export function coachHubReportTitle(r: { title: string }): string {
  return r.title.trim() || CM_COPY.reportTitleFallback;
}

export function coachHubReportPreview(r: { contentPreview: string }): string {
  return r.contentPreview.trim() || CM_COPY.hubReportPreviewEmpty;
}

export function coachHubActionTitle(a: { title: string }): string {
  return a.title.trim() || CM_COPY.actionTitleFallback;
}

export function coachHubActionPreview(a: { descriptionPreview: string }): string {
  return a.descriptionPreview.trim() || CM_COPY.hubActionPreviewEmpty;
}

export function coachHubDraftPreview(d: { textPreview: string }): string {
  return d.textPreview.trim() || CM_COPY.hubDraftPreviewEmpty;
}
