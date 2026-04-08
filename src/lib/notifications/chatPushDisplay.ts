import { prisma } from "@/lib/prisma";

const PREVIEW_MAX = 120;
const BODY_MAX = 160;

export function truncatePreview(text: string, max = PREVIEW_MAX): string {
  const t = text.trim();
  if (!t) return "";
  return t.slice(0, max) + (t.length > max ? "…" : "");
}

export function truncateBody(text: string, max = BODY_MAX): string {
  const t = text.trim();
  if (!t) return "";
  return t.slice(0, max) + (t.length > max ? "…" : "");
}

export async function resolveCoachSenderName(
  coachId: string
): Promise<string> {
  const coach = await prisma.coach.findUnique({
    where: { id: coachId },
    select: { displayName: true, firstName: true, lastName: true },
  });
  if (!coach) return "Тренер";
  const dn = coach.displayName?.trim();
  if (dn) return dn;
  const full = `${coach.firstName} ${coach.lastName}`.trim();
  return full || "Тренер";
}

export async function resolveParentSenderName(
  parentId: string
): Promise<string> {
  const parent = await prisma.parent.findUnique({
    where: { id: parentId },
    select: { firstName: true, lastName: true },
  });
  if (!parent) return "Родитель";
  const full = `${parent.firstName} ${parent.lastName}`.trim();
  return full || "Родитель";
}

export function chatPushCollapseKey(conversationId: string): string {
  return `hockey-chat:${conversationId}`;
}
