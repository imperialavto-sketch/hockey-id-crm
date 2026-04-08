/**
 * Отображение строк inbox на CRM /communications без смены визуального дизайна.
 * Поддерживает CoachInboxListRow и legacy-ответ school admin (без type/conversationKind).
 */

import {
  coachInboxRowActivityMs,
  type CoachInboxListRow,
  type CoachInboxListRowType,
} from "@/lib/messenger/coachInboxListContract";
import { MESSENGER_KIND } from "@/lib/messenger-kinds";

/** Минимум полей для списка + school-admin ветка API. */
export type CommunicationsInboxListRow = CoachInboxListRow | LegacySchoolAdminChatListRow;

export function isCommunicationsInboxListRow(
  x: unknown
): x is CommunicationsInboxListRow {
  if (typeof x !== "object" || x === null) return false;
  const o = x as { id?: unknown };
  return typeof o.id === "string" && o.id.length > 0;
}

export type LegacySchoolAdminChatListRow = {
  id: string;
  playerId: string;
  playerName: string;
  coachId: string;
  coachName: string;
  parentId: string;
  parentName?: string;
  lastMessage?: string;
  updatedAt: string;
};

function isTeamParentChannelRow(row: CommunicationsInboxListRow): boolean {
  const t = (row as CoachInboxListRow).type as CoachInboxListRowType | undefined;
  const k = (row as CoachInboxListRow).conversationKind;
  return (
    t === "team_parent_channel" || k === MESSENGER_KIND.TEAM_PARENT_CHANNEL
  );
}

export function communicationsInboxRowTitle(row: CommunicationsInboxListRow): string {
  if (isTeamParentChannelRow(row)) {
    const r = row as CoachInboxListRow;
    return (r.title ?? r.threadTitle ?? "Родители команды").trim();
  }
  const r = row as CoachInboxListRow & LegacySchoolAdminChatListRow;
  if (r.title?.trim()) return r.title.trim();
  const parent = (r.parentName ?? "Родитель").trim();
  const player = (r.playerName ?? "Игрок").trim();
  return `${parent} ↔ ${player}`;
}

export function communicationsInboxRowPreviewText(row: CommunicationsInboxListRow): string {
  const p = ((row as CoachInboxListRow).preview ?? "").trim();
  if (p) return p;
  return ((row as { lastMessage?: string }).lastMessage ?? "").trim();
}

export function communicationsInboxRowTimestampIso(row: CommunicationsInboxListRow): string {
  const r = row as CoachInboxListRow & LegacySchoolAdminChatListRow;
  return (r.updatedAt ?? r.lastMessageAt ?? "").trim();
}

/** Сортировка списка: lastMessageAt → updatedAt (как coachInboxRowActivityMs). */
export function communicationsInboxRowActivityMs(row: CommunicationsInboxListRow): number {
  const r = row as CoachInboxListRow & LegacySchoolAdminChatListRow;
  return coachInboxRowActivityMs({
    lastMessageAt: r.lastMessageAt,
    updatedAt: r.updatedAt,
  });
}
