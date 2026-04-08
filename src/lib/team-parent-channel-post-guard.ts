/**
 * In-memory rate limit + текстовые проверки для POST в `team_parent_channel` (родитель).
 * Без Prisma schema; только для TEAM_PARENT_CHANNEL.
 */

import { prisma } from "@/lib/prisma";

const WINDOW_MS = 60_000;
const SHORT_MS = 10_000;
/** >5 за 10 с → отклоняем 6-е и далее */
const MAX_IN_SHORT_WINDOW = 5;
/** >20 за 60 с → отклоняем 21-е и далее */
const MAX_IN_LONG_WINDOW = 20;

const rateTimestamps = new Map<string, number[]>();

function rateKey(parentId: string, conversationId: string): string {
  return `${parentId}\0${conversationId}`;
}

function pruneWindow(timestamps: number[], now: number): number[] {
  return timestamps.filter((t) => now - t <= WINDOW_MS);
}

export function validateTeamParentChannelMessageText(
  trimmed: string
): { ok: true } | { ok: false; error: string } {
  if (trimmed.length > 1000) {
    return { ok: false, error: "Message too long" };
  }
  const matches = trimmed.match(/https?:\/\//gi) ?? [];
  if (matches.length > 3) {
    return { ok: false, error: "Too many links" };
  }
  return { ok: true };
}

export async function isDuplicateTeamParentChannelMessage(
  conversationId: string,
  parentId: string,
  trimmed: string
): Promise<boolean> {
  const last = await prisma.chatMessage.findFirst({
    where: { conversationId, senderId: parentId },
    orderBy: { createdAt: "desc" },
    select: { text: true },
  });
  return last !== null && last.text === trimmed;
}

export function consumeTeamParentChannelRateSlot(
  parentId: string,
  conversationId: string
): { ok: true } | { ok: false } {
  const key = rateKey(parentId, conversationId);
  const now = Date.now();
  let arr = pruneWindow(rateTimestamps.get(key) ?? [], now);
  const inShort = arr.filter((t) => now - t <= SHORT_MS).length;
  if (inShort >= MAX_IN_SHORT_WINDOW) {
    return { ok: false };
  }
  if (arr.length >= MAX_IN_LONG_WINDOW) {
    return { ok: false };
  }
  arr.push(now);
  rateTimestamps.set(key, arr);
  return { ok: true };
}

export function rollbackTeamParentChannelRateSlot(
  parentId: string,
  conversationId: string
): void {
  const key = rateKey(parentId, conversationId);
  const arr = rateTimestamps.get(key);
  if (!arr?.length) return;
  arr.pop();
  if (arr.length === 0) {
    rateTimestamps.delete(key);
  } else {
    rateTimestamps.set(key, arr);
  }
}
