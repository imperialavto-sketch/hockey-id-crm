/**
 * Условный POST read для тренера: только при реальных unread parent-сообщениях в снимке треда.
 * Требует readAt + senderRole в ответе GET /api/coach/messages/[id].
 */

export type CoachThreadMessageReadProbe = {
  id: string;
  isOwn: boolean;
  senderRole?: string;
  readAt?: string | null;
};

export function isIncomingParentForCoach(m: CoachThreadMessageReadProbe): boolean {
  if (m.senderRole === 'parent') return true;
  if (m.senderRole === 'coach') return false;
  if (m.senderRole && m.senderRole !== 'parent' && m.senderRole !== 'coach') {
    return false;
  }
  return !m.isOwn;
}

export function coachThreadHasUnreadParentForCoach(
  messages: CoachThreadMessageReadProbe[]
): boolean {
  return messages.some(
    (m) => isIncomingParentForCoach(m) && (m.readAt == null || m.readAt === '')
  );
}

export function applyCoachReadOptimisticPatch<
  T extends CoachThreadMessageReadProbe,
>(messages: T[], shouldPatch: boolean): T[] {
  if (!shouldPatch) return messages;
  const nowIso = new Date().toISOString();
  return messages.map((m) =>
    isIncomingParentForCoach(m) && (m.readAt == null || m.readAt === '')
      ? ({ ...m, readAt: nowIso } as T)
      : m
  );
}
